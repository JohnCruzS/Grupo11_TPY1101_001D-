#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://qpttobsxyvmaxtmzcver.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: Se requiere SUPABASE_SERVICE_ROLE_KEY');
  console.log('\n🔧 Opciones:');
  console.log(
    '1. Ejecutar con: SUPABASE_SERVICE_ROLE_KEY=tu_key node scripts/migrate.js'
  );
  console.log(
    '2. Ir a https://supabase.com/dashboard > Project Settings > API > service_role key'
  );
  console.log(
    '\n⚠️  NOTA: Por seguridad, el service role key no debe compartirse ni subirse a Git'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL() {
  console.log('🚀 Iniciando migración...\n');

  try {

    const sqlPath = join(
      __dirname,
      '..',
      'src',
      'app',
      'database',
      'schema_complete.sql'
    );
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    console.log('📄 Archivo SQL cargado:', sqlPath);
    console.log('📊 Tamaño:', sqlContent.length, 'caracteres\n');

    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter(
        (s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*')
      );

    console.log(`🔧 Ejecutando ${statements.length} statements...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const shortDesc = statement.substring(0, 50).replace(/\n/g, ' ') + '...';

      process.stdout.write(`[${i + 1}/${statements.length}] ${shortDesc} ... `);

      try {
        const { error } = await supabase.rpc('exec_sql', {
          query: statement + ';',
        });

        if (error) {

          const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'tx=commit',
            },
            body: JSON.stringify({ query: statement + ';' }),
          });

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}: ${await response.text()}`
            );
          }
        }

        console.log('✅');
        successCount++;
      } catch (err) {
        console.log('❌');
        errorCount++;
        errors.push({
          statement: shortDesc,
          error: err.message,
        });

        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate')
        ) {
          console.log(`   ⚠️  (Posiblemente ya existe - no crítico)`);
          errorCount--;
        } else {
          console.log(`   Error: ${err.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Exitosos: ${successCount}/${statements.length}`);
    console.log(`❌ Errores: ${errorCount}/${statements.length}`);

    if (errors.length > 0 && errorCount > 0) {
      console.log('\n⚠️  Errores encontrados:');
      errors.slice(0, 5).forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.statement}`);
        console.log(`      → ${e.error}`);
      });
      if (errors.length > 5) {
        console.log(`   ... y ${errors.length - 5} errores más`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migración completada');
    console.log('='.repeat(50));

    if (errorCount === 0) {
      console.log('\n🎉 Todas las tablas creadas exitosamente!');
      console.log('\n📋 Tablas creadas:');
      console.log('   • empleados');
      console.log('   • cargas');
      console.log('   • documento_version');
      console.log('   • subscriptions');
      console.log('   • payments');
      console.log('   • notificaciones');
      console.log('\n✅ Columnas agregadas a documents y enterprises');
    }
  } catch (err) {
    console.error('\n❌ Error fatal:', err.message);
    console.log(
      '\n💡 Alternativa: Copia el SQL manualmente en Supabase Dashboard'
    );
    console.log('   1. Ve a https://supabase.com/dashboard');
    console.log('   2. SQL Editor > New query');
    console.log(
      '   3. Copia el contenido de src/app/database/schema_complete.sql'
    );
    console.log('   4. Ejecuta');
    process.exit(1);
  }
}

executeSQL();
