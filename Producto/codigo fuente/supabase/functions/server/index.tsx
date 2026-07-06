import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use("*", logger(console.log));
const corsOptions = cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
});
app.options("*", corsOptions);
app.use("*", corsOptions);
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return c.text("", 204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    });
  }
  const res = await next();
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  return res;
});

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getAuthUser(req: Request) {
  const token = req.headers.get("Authorization")?.split(" ")[1];
  if (!token) return null;
  const supabase = getAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getProfile(userId: string): Promise<UserProfile | null> {
  return await kv.get(`slc_user:${userId}`) as UserProfile | null;
}

async function requireAuth(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, profile: null, error: "Unauthorized" };
  const profile = await getProfile(user.id);
  return { user, profile, error: null };
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

async function auditLog(userId: string, action: string, resource: string, resourceId: string, details: Record<string, any>, req?: Request) {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: req?.headers.get("CF-Connecting-IP") || req?.headers.get("X-Forwarded-For"),
    userAgent: req?.headers.get("User-Agent"),
    timestamp: new Date().toISOString(),
  };

  const supabase = getAdminClient();
  const { error } = await supabase.from("audit_log").insert(entry);
  if (error) console.log("Audit log error:", error);
}

interface Company {
  id: string;
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  estado: "activo" | "inactivo";
  plan?: string;
  userIds: string[];
  createdAt: string;
}

interface Document {
  id: string;
  userId: string;
  nombre: string;
  tipo: string;
  path: string;
  mimeType: string;
  size: number;
  empresaId: string;
  uploadedBy: string;
  fecha: string;
}

interface Payment {
  id: string;
  empresaId: string;
  empresaNombre: string;
  monto: number;
  concepto: string;
  estado: "pagado" | "pendiente" | "vencido";
  fechaPago?: string;
  fechaVencimiento: string;
  createdAt: string;
}

const BUCKET = "make-7d36b31f-docs";
async function ensureBucket() {
  const supabase = getAdminClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: false });
    console.log(`Bucket ${BUCKET} created`);
  }
}

async function seedData() {
  const already = await kv.get("slc_seeded");
  if (already) return { message: "Already seeded" };

  const supabase = getAdminClient();
  await ensureBucket();

  const users = [
    { email: "usuario1@gmail.com", password: "usuario12345678", nombre: "Carlos", apellido: "Mendoza", rol: "usuario" as const },
    { email: "pyme@gmail.com",     password: "pyme12345678",     nombre: "PyME",   apellido: "Empresas", rol: "empresa" as const },
    { email: "admin@admin.com",    password: "admin12345678",    nombre: "Admin",  apellido: "SotLoy",  rol: "admin" as const },
    { email: "superadmin@sotloy.cl", password: "superadmin12345678", nombre: "Super", apellido: "Admin", rol: "superadmin" as const },
  ];

  const createdIds: Record<string, string> = {};
  const companyId = crypto.randomUUID();

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error && !error.message.includes("already")) {
      console.log(`Error creating user ${u.email}: ${error.message}`);
      continue;
    }
    const uid = data?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(x => x.email === u.email)?.id;
    if (!uid) continue;
    createdIds[u.rol] = uid;
    const profile: UserProfile = {
      id: uid, email: u.email, nombre: u.nombre, apellido: u.apellido,
      rol: u.rol, createdAt: new Date().toISOString(),
      ...(u.rol === "usuario" ? { empresaId: companyId } : {}),
    };
    await kv.set(`slc_user:${uid}`, profile);
  }

  const company: Company = {
    id: companyId,
    nombre: "PyME Empresas de Pruebas",
    rut: "76.123.456-7",
    email: "contacto@pymepruebas.cl",
    telefono: "+56 9 8765 4321",
    estado: "activo",
    plan: "RRHH Integral",
    userIds: createdIds["usuario"] ? [createdIds["usuario"]] : [],
    createdAt: new Date().toISOString(),
  };
  await kv.set(`slc_company:${companyId}`, company);

  if (createdIds["empresa"]) {
    const empProfile = await kv.get(`slc_user:${createdIds["empresa"]}`) as UserProfile;
    if (empProfile) {
      await kv.set(`slc_user:${createdIds["empresa"]}`, { ...empProfile, empresaId: companyId });
    }
  }
  if (createdIds["usuario"]) {
    const userProfile = await kv.get(`slc_user:${createdIds["usuario"]}`) as UserProfile;
    if (userProfile) {
      await kv.set(`slc_user:${createdIds["usuario"]}`, { ...userProfile, empresaId: companyId });
    }
  }

  const sampleDocs = [
    { nombre: "Contrato de trabajo 2025.pdf", tipo: "contrato" },
    { nombre: "Liquidación enero 2025.pdf",   tipo: "liquidacion" },
    { nombre: "Liquidación febrero 2025.pdf", tipo: "liquidacion" },
  ];
  if (createdIds["usuario"] && createdIds["empresa"]) {
    for (const doc of sampleDocs) {
      const docId = crypto.randomUUID();
      const d: Document = {
        id: docId,
        userId: createdIds["usuario"],
        nombre: doc.nombre,
        tipo: doc.tipo,
        path: `demo/${docId}.pdf`,
        mimeType: "application/pdf",
        size: 204800,
        empresaId: companyId,
        uploadedBy: createdIds["empresa"],
        fecha: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      };
      await kv.set(`slc_doc:${docId}`, d);
    }
  }

  const months = ["Enero 2025", "Febrero 2025", "Marzo 2025"];
  const estados: Payment["estado"][] = ["pagado", "pagado", "pendiente"];
  for (let i = 0; i < months.length; i++) {
    const payId = crypto.randomUUID();
    const p: Payment = {
      id: payId,
      empresaId: companyId,
      empresaNombre: company.nombre,
      monto: 89000 + i * 5000,
      concepto: `Servicio RRHH Integral - ${months[i]}`,
      estado: estados[i],
      fechaVencimiento: new Date(2025, i, 28).toISOString(),
      fechaPago: estados[i] === "pagado" ? new Date(2025, i, 15).toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`slc_payment:${payId}`, p);
  }

  await kv.set("slc_seeded", true);
  return { message: "Seeded successfully", userCount: users.length };
}

app.get("/documents/:id/download", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);

  const docId = c.req.param("id");
  const doc = await kv.get(`slc_doc:${docId}`) as Document;
  if (!doc) return c.json({ error: "Document not found" }, 404);

  if (profile!.rol !== "superadmin" && profile!.empresaId !== doc.empresaId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const supabase = getAdminClient();
  const { data, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.path, 3600);

  if (urlError) return c.json({ error: "Failed to generate signed URL" }, 500);

  await auditLog(profile!.id, "download", "document", docId, { fileName: doc.nombre }, c.req.raw);

  return c.json({ signedUrl: data.signedUrl, expiresAt: new Date(Date.now() + 3600000).toISOString() });
});

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  category: string;
  publishedDate: string;
  indexedAt: string;
  embedding?: number[];
}

app.post("/spider/crawl", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);

  return c.json({
    message: "Web spider initiated",
    status: "pending",
    estimatedCompletion: "2026-04-10T00:00:00Z"
  });
});

app.get("/legal-documents", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);

  const docs = await kv.getByPrefix("slc_legal:");
  return c.json(docs);
});

app.get("/reports/lre/:empresaId", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);

  const empresaId = c.req.param("empresaId");
  if (profile!.rol !== "superadmin" && profile!.empresaId !== empresaId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const format = c.req.query("format") || "csv";

  const company = await kv.get(`slc_company:${empresaId}`) as Company;
  const users = await kv.getByPrefix("slc_user:").filter((u: UserProfile) => u.empresaId === empresaId);
  const documents = await kv.getByPrefix("slc_doc:").filter((d: Document) => d.empresaId === empresaId);

  if (format === "csv") {
    const csv = generateLRECSV(company, users, documents);
    return c.text(csv, 200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=lre-report.csv" });
  } else {
    const xml = generateLREXML(company, users, documents);
    return c.text(xml, 200, { "Content-Type": "application/xml", "Content-Disposition": "attachment; filename=lre-report.xml" });
  }
});

function generateLRECSV(company: Company, users: UserProfile[], documents: Document[]): string {
  let csv = "Empresa,RUT,Trabajador,Documento,Tipo,Fecha\n";
  for (const doc of documents) {
    const user = users.find(u => u.id === doc.userId);
    if (user) {
      csv += `"${company.nombre}","${company.rut || ''}","${user.nombre} ${user.apellido}","${doc.nombre}","${doc.tipo}","${doc.fecha}"\n`;
    }
  }
  return csv;
}

function generateLREXML(company: Company, users: UserProfile[], documents: Document[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<lre-report>\n';
  xml += `  <empresa nombre="${company.nombre}" rut="${company.rut || ''}">\n`;

  for (const doc of documents) {
    const user = users.find(u => u.id === doc.userId);
    if (user) {
      xml += `    <documento>\n`;
      xml += `      <trabajador>${user.nombre} ${user.apellido}</trabajador>\n`;
      xml += `      <nombre>${doc.nombre}</nombre>\n`;
      xml += `      <tipo>${doc.tipo}</tipo>\n`;
      xml += `      <fecha>${doc.fecha}</fecha>\n`;
      xml += `    </documento>\n`;
    }
  }

  xml += '  </empresa>\n</lre-report>';
  return xml;
}

app.post("/seed", async (c) => {
  try {
    const result = await seedData();
    return c.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("Seed error:", msg);
    return c.json({ error: `Seed failed: ${msg}` }, 500);
  }
});

app.post("/seed/create-profile", async (c) => {
  try {
    const apiKey = c.req.header("apikey");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (apiKey !== serviceRoleKey) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { userId, profile } = body;

    if (!userId || !profile) {
      return c.json({ error: "Missing userId or profile" }, 400);
    }

    await kv.set(`slc_user:${userId}`, profile);

    return c.json({ success: true, profile }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("Create profile error:", msg);
    return c.json({ error: `Failed: ${msg}` }, 500);
  }

app.get("/auth/me", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  return c.json(profile);
});

app.get("/users", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (!profile || !["admin", "superadmin"].includes(profile.rol)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const all = await kv.getByPrefix("slc_user:");
  return c.json(all);
});

app.get("/users/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  const targetId = c.req.param("id");
  if (profile!.id !== targetId && !["admin", "superadmin", "empresa"].includes(profile!.rol)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const target = await kv.get(`slc_user:${targetId}`);
  if (!target) return c.json({ error: "User not found" }, 404);
  return c.json(target);
});

app.put("/users/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  const targetId = c.req.param("id");
  const isSelf = profile!.id === targetId;
  if (!isSelf && profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const existing = await kv.get(`slc_user:${targetId}`) as UserProfile;
  if (!existing) return c.json({ error: "User not found" }, 404);

  const updated: UserProfile = {
    ...existing,
    nombre: body.nombre ?? existing.nombre,
    apellido: body.apellido ?? existing.apellido,
    telefono: body.telefono ?? existing.telefono,
    rol: profile!.rol === "superadmin" && body.rol ? body.rol : existing.rol,
    empresaId: profile!.rol === "superadmin" && body.empresaId !== undefined ? body.empresaId : existing.empresaId,
  };
  await kv.set(`slc_user:${targetId}`, updated);
  return c.json(updated);
});

app.delete("/users/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const targetId = c.req.param("id");
  const supabase = getAdminClient();
  await supabase.auth.admin.deleteUser(targetId);
  await kv.del(`slc_user:${targetId}`);
  return c.json({ success: true });
});

app.post("/users/register", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const { email, password, nombre, apellido, rol, empresaId } = body;
  const supabase = getAdminClient();
  const { data, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) return c.json({ error: `Auth error: ${createErr.message}` }, 400);
  const uid = data.user!.id;
  const newProfile: UserProfile = {
    id: uid, email, nombre, apellido, rol: rol || "usuario",
    empresaId, createdAt: new Date().toISOString(),
  };
  await kv.set(`slc_user:${uid}`, newProfile);

  if (empresaId) {
    const company = await kv.get(`slc_company:${empresaId}`) as Company;
    if (company && !company.userIds.includes(uid)) {
      company.userIds.push(uid);
      await kv.set(`slc_company:${empresaId}`, company);
    }
  }
  return c.json(newProfile, 201);
});

app.get("/companies", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (!["admin", "superadmin"].includes(profile!.rol)) return c.json({ error: "Forbidden" }, 403);
  const all = await kv.getByPrefix("slc_company:");
  return c.json(all);
});

app.get("/companies/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  const companyId = c.req.param("id");
  if (!["admin", "superadmin"].includes(profile!.rol) && profile!.empresaId !== companyId) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const company = await kv.get(`slc_company:${companyId}`);
  if (!company) return c.json({ error: "Not found" }, 404);
  return c.json(company);
});

app.post("/companies", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const company: Company = {
    id, nombre: body.nombre, rut: body.rut, email: body.email,
    telefono: body.telefono, estado: body.estado || "activo",
    plan: body.plan, userIds: [], createdAt: new Date().toISOString(),
  };
  await kv.set(`slc_company:${id}`, company);
  return c.json(company, 201);
});

app.put("/companies/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const id = c.req.param("id");
  const existing = await kv.get(`slc_company:${id}`) as Company;
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json();
  const updated = { ...existing, ...body, id };
  await kv.set(`slc_company:${id}`, updated);
  return c.json(updated);
});

app.delete("/companies/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const id = c.req.param("id");
  await kv.del(`slc_company:${id}`);
  return c.json({ success: true });
});

app.post("/companies/:id/assign", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const companyId = c.req.param("id");
  const { userId } = await c.req.json();
  const company = await kv.get(`slc_company:${companyId}`) as Company;
  const userProf = await kv.get(`slc_user:${userId}`) as UserProfile;
  if (!company || !userProf) return c.json({ error: "Not found" }, 404);
  if (!company.userIds.includes(userId)) company.userIds.push(userId);
  await kv.set(`slc_company:${companyId}`, company);
  await kv.set(`slc_user:${userId}`, { ...userProf, empresaId: companyId });
  return c.json({ success: true });
});

app.get("/companies/:id/workers", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  const companyId = c.req.param("id");
  if (!["admin", "superadmin"].includes(profile!.rol) && profile!.empresaId !== companyId) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const company = await kv.get(`slc_company:${companyId}`) as Company;
  if (!company) return c.json({ error: "Not found" }, 404);
  const workers = await Promise.all(
    company.userIds.map((uid) => kv.get(`slc_user:${uid}`))
  );
  return c.json(workers.filter(Boolean));
});

app.get("/documents", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (!["admin", "superadmin"].includes(profile!.rol)) return c.json({ error: "Forbidden" }, 403);
  const all = await kv.getByPrefix("slc_doc:");
  return c.json(all);
});

app.get("/documents/user/:userId", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  const targetId = c.req.param("userId");
  const isSelf = profile!.id === targetId;
  const isAdmin = ["admin", "superadmin"].includes(profile!.rol);
  const isEmpresaOfUser = profile!.rol === "empresa" && (async () => {
    const targetUser = await kv.get(`slc_user:${targetId}`) as UserProfile;
    return targetUser?.empresaId === profile!.empresaId;
  })();
  if (!isSelf && !isAdmin) {
    if (profile!.rol !== "empresa") return c.json({ error: "Forbidden" }, 403);
    const targetUser = await kv.get(`slc_user:${targetId}`) as UserProfile;
    if (!targetUser || targetUser.empresaId !== profile!.empresaId) {
      return c.json({ error: "Forbidden" }, 403);
    }
  }
  const all = await kv.getByPrefix("slc_doc:");
  const userDocs = (all as Document[]).filter((d) => d.userId === targetId);

  const supabase = getAdminClient();
  const docsWithUrls = await Promise.all(
    userDocs.map(async (doc) => {
      if (doc.path.startsWith("demo/")) return { ...doc, url: null };
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.path, 3600);
      return { ...doc, url: data?.signedUrl || null };
    })
  );
  return c.json(docsWithUrls);
});

app.post("/documents", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "empresa") return c.json({ error: "Only empresa can upload documents" }, 403);

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string;
    const nombre = formData.get("nombre") as string;
    const tipo = formData.get("tipo") as string;

    if (!file || !userId) return c.json({ error: "Missing file or userId" }, 400);

    const targetUser = await kv.get(`slc_user:${userId}`) as UserProfile;
    if (!targetUser || targetUser.empresaId !== profile!.empresaId) {
      return c.json({ error: "User does not belong to your company" }, 403);
    }

    await ensureBucket();
    const supabase = getAdminClient();
    const fileBuffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "pdf";
    const path = `documents/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileBuffer, { contentType: file.type, upsert: false });
    if (storageErr) return c.json({ error: `Storage: ${storageErr.message}` }, 500);

    const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);

    const docId = crypto.randomUUID();
    const doc: Document = {
      id: docId, userId,
      nombre: nombre || file.name,
      tipo: tipo || "documento",
      path, mimeType: file.type,
      size: file.size,
      empresaId: profile!.empresaId!,
      uploadedBy: profile!.id,
      fecha: new Date().toISOString(),
    };
    await kv.set(`slc_doc:${docId}`, doc);
    return c.json({ ...doc, url: urlData?.signedUrl }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("Upload error:", msg);
    return c.json({ error: `Upload failed: ${msg}` }, 500);
  }
});

app.delete("/documents/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  const docId = c.req.param("id");
  const doc = await kv.get(`slc_doc:${docId}`) as Document;
  if (!doc) return c.json({ error: "Not found" }, 404);
  const canDelete =
    ["admin", "superadmin"].includes(profile!.rol) ||
    (profile!.rol === "empresa" && doc.empresaId === profile!.empresaId);
  if (!canDelete) return c.json({ error: "Forbidden" }, 403);
  if (!doc.path.startsWith("demo/")) {
    const supabase = getAdminClient();
    await supabase.storage.from(BUCKET).remove([doc.path]);
  }
  await kv.del(`slc_doc:${docId}`);
  return c.json({ success: true });
});

app.get("/payments", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (!["admin", "superadmin"].includes(profile!.rol)) return c.json({ error: "Forbidden" }, 403);
  const all = await kv.getByPrefix("slc_payment:");
  return c.json(all);
});

app.post("/payments", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const payment: Payment = {
    id,
    empresaId: body.empresaId,
    empresaNombre: body.empresaNombre,
    monto: body.monto,
    concepto: body.concepto,
    estado: body.estado || "pendiente",
    fechaVencimiento: body.fechaVencimiento,
    fechaPago: body.fechaPago,
    createdAt: new Date().toISOString(),
  };
  await kv.set(`slc_payment:${id}`, payment);
  return c.json(payment, 201);
});

app.put("/payments/:id", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (!["admin", "superadmin"].includes(profile!.rol)) return c.json({ error: "Forbidden" }, 403);
  const id = c.req.param("id");
  const existing = await kv.get(`slc_payment:${id}`) as Payment;
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json();
  const updated = { ...existing, ...body, id };
  await kv.set(`slc_payment:${id}`, updated);
  return c.json(updated);
});

interface RAGQuery {
  query: string;
  context?: string;
  maxResults?: number;
}

interface RAGResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
  confidence: number;
}

app.post("/rag/query", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);

  const body: RAGQuery = await c.req.json();
  const { query, maxResults = 5 } = body;

  const queryEmbedding = await generateEmbedding(query);

  const supabase = getAdminClient();
  const { data: similarDocs, error: searchError } = await supabase
    .from("legal_documents")
    .select("id, title, content, source, url, published_date, embedding")
    .order("embedding <-> '[${queryEmbedding.join(',')}]'", { ascending: true })
    .limit(maxResults);

  if (searchError) return c.json({ error: "Search failed" }, 500);

  const context = similarDocs.map((doc: any) =>
    `Título: ${doc.title}\nContenido: ${doc.content}\nFuente: ${doc.source}\nURL: ${doc.url}`
  ).join("\n\n");

  const prompt = `Eres LOY, un asistente legal especializado en derecho laboral chileno.
  Responde basándote ÚNICAMENTE en la información proporcionada a continuación.
  Si no encuentras información relevante, indica que no puedes responder con certeza.
  Siempre cita las fuentes oficiales y no reemplaces asesoría legal profesional.

  Consulta del usuario: ${query}

  Información relevante de la normativa chilena:
  ${context}

  Respuesta:`;

  const response = await queryOpenAI(prompt);

  const sources = similarDocs.map((doc: any) => ({
    title: doc.title,
    url: doc.url,
    relevance: calculateRelevance(queryEmbedding, doc.embedding)
  }));

  await auditLog(profile!.id, "rag_query", "legal_assistant", "system", { query, sourcesCount: sources.length }, c.req.raw);

  return c.json({
    answer: response,
    sources,
    confidence: sources.length > 0 ? 0.8 : 0.3
  });
});

async function generateEmbedding(text: string): Promise<number[]> {

  return new Array(1536).fill(0).map(() => Math.random());
}

async function queryOpenAI(prompt: string): Promise<string> {

  return "Esta es una respuesta simulada del asistente LOY. En producción, se conectaría con OpenAI GPT-4o mini para generar respuestas basadas en normativa chilena.";
}

function calculateRelevance(queryEmbedding: number[], docEmbedding: number[]): number {

  const dotProduct = queryEmbedding.reduce((sum, q, i) => sum + q * docEmbedding[i], 0);
  const queryNorm = Math.sqrt(queryEmbedding.reduce((sum, q) => sum + q * q, 0));
  const docNorm = Math.sqrt(docEmbedding.reduce((sum, d) => sum + d * d, 0));
  return dotProduct / (queryNorm * docNorm);
}

interface PaymentIntent {
  id: string;
  empresaId: string;
  amount: number;
  currency: string;
  description: string;
  status: "pending" | "completed" | "failed";
  flowOrder: string;
  createdAt: string;
}

app.post("/payments/create", async (c) => {
  const { profile, error } = await requireAuth(c.req.raw);
  if (error) return c.json({ error }, 401);
  if (profile!.rol !== "empresa" && profile!.rol !== "superadmin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const { amount, description } = body;

  const paymentIntent: PaymentIntent = {
    id: crypto.randomUUID(),
    empresaId: profile!.empresaId || profile!.id,
    amount,
    currency: "CLP",
    description,
    status: "pending",
    flowOrder: `ORDER_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`slc_payment_intent:${paymentIntent.id}`, paymentIntent);

  await auditLog(profile!.id, "create_payment", "payment", paymentIntent.id, { amount, description }, c.req.raw);

  return c.json({
    paymentIntentId: paymentIntent.id,
    flowUrl: `https://flow.cl/pay/${paymentIntent.flowOrder}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  });
});

app.post("/payments/webhook", async (c) => {
  const body = await c.req.json();
  const { orderId, status, amount } = body;

  const paymentIntent = await kv.getByPrefix("slc_payment_intent:").find((p: PaymentIntent) => p.flowOrder === orderId);
  if (paymentIntent) {
    paymentIntent.status = status === "success" ? "completed" : "failed";
    await kv.set(`slc_payment_intent:${paymentIntent.id}`, paymentIntent);

    if (status === "success") {
      const company = await kv.get(`slc_company:${paymentIntent.empresaId}`) as Company;
      if (company) {
        company.plan = "premium";
        await kv.set(`slc_company:${paymentIntent.empresaId}`, company);
      }
    }
  }

  return c.json({ received: true });
});

app.post("/kv/set", async (c) => {
  const { key, value } = await c.req.json();
  if (!key || value === undefined) {
    return c.json({ error: "Key and value are required" }, 400);
  }
  try {
    await kv.set(key, value);
    return c.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ error: msg }, 500);
  }
});

app.get("/kv/get/:key", async (c) => {
  const key = c.req.param("key");
  try {
    const value = await kv.get(key);
    if (value === null) {
      return c.json({ error: "Key not found" }, 404);
    }
    return c.json(value);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ error: msg }, 500);
  }
});

app.get("/health", (c) => c.json({ status: "ok" }));

Deno.serve(app.fetch);
