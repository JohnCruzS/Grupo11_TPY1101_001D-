#!/usr/bin/env python3
"""
Web Spider para Dirección del Trabajo (DT) - Chile
Scrapea normativas laborales y las envía al sistema LOY

Ejecución manual:
  python spider.py

Ejecución programada (cron):
  0 0 * * 4 python /ruta/al/spider.py  # Jueves a medianoche
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json
import os
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

# Configuración
BASE_URL = "https://www.dt.gob.cl"
NORMATIVA_URL = "https://www.dt.gob.cl/legislacion/normas-juridicas/"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

class DTSpider:
    """Spider para recolectar normativas de la Dirección del Trabajo"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.found_documents = []
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Obtiene y parsea una página HTML"""
        try:
            print(f"🌐 Fetching: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except Exception as e:
            print(f"❌ Error fetching {url}: {e}")
            return None
    
    def extract_normativas(self) -> List[Dict]:
        """Extrae lista de normativas desde la página principal"""
        soup = self.fetch_page(NORMATIVA_URL)
        if not soup:
            return []
        
        documents = []
        
        # Buscar enlaces a documentos normativos
        # Nota: Los selectores pueden cambiar, se deben ajustar según la estructura actual
        article_links = soup.find_all('article') or soup.find_all('div', class_='entry')
        
        for article in article_links[:10]:  # Limitar a 10 para pruebas
            try:
                # Extraer título
                title_elem = article.find('h2') or article.find('h3') or article.find('a')
                title = title_elem.get_text(strip=True) if title_elem else "Sin título"
                
                # Extraer enlace
                link_elem = article.find('a', href=True)
                if link_elem:
                    href = link_elem['href']
                    full_url = urljoin(BASE_URL, href)
                    
                    documents.append({
                        'title': title,
                        'url': full_url,
                        'source_type': 'dt_normativa',
                        'category': self._categorize(title)
                    })
            except Exception as e:
                print(f"⚠️ Error extrayendo artículo: {e}")
                continue
        
        print(f"📄 Encontrados {len(documents)} documentos en listado principal")
        return documents
    
    def extract_document_content(self, url: str) -> Optional[Dict]:
        """Extrae el contenido completo de un documento específico"""
        soup = self.fetch_page(url)
        if not soup:
            return None
        
        try:
            # Intentar extraer el contenido principal
            # Buscar contenedor principal (ajustar selectores según estructura real)
            content_div = (
                soup.find('div', class_='entry-content') or
                soup.find('div', class_='content') or
                soup.find('main') or
                soup.find('article')
            )
            
            if content_div:
                # Limpiar el texto
                text = content_div.get_text(separator='\n', strip=True)
                # Eliminar líneas vacías múltiples
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                clean_text = '\n'.join(lines)
                
                return {
                    'content': clean_text,
                    'word_count': len(clean_text.split()),
                    'scraped_at': datetime.now().isoformat()
                }
            else:
                print(f"⚠️ No se encontró contenido principal en {url}")
                return None
                
        except Exception as e:
            print(f"❌ Error extrayendo contenido de {url}: {e}")
            return None
    
    def _categorize(self, title: str) -> str:
        """Categoriza un documento según su título"""
        title_lower = title.lower()
        
        categorias = {
            'contratos': ['contrato', 'contratos', 'plazo fijo', 'indefinido', 'obra'],
            'vacaciones': ['vacaciones', 'feriado', 'descanso'],
            'finiquitos': ['finiquito', 'despido', 'renuncia', 'indemnización'],
            'salud': ['seguridad', 'salud', 'riesgo', 'accidente'],
            'remuneraciones': ['sueldo', 'salario', 'remuneración', 'aguinaldo', 'gratificación'],
            'jornada': ['jornada', 'horas extras', 'horario', 'teletrabajo'],
            'maternidad': ['maternal', 'prental', 'postnatal', 'lactancia'],
            'impuestos': ['impuesto', 'tributario', 'afp', 'salud'],
        }
        
        for categoria, keywords in categorias.items():
            if any(kw in title_lower for kw in keywords):
                return categoria
        
        return 'general'
    
    def send_to_ingest(self, document: Dict) -> bool:
        """Envía el documento a la Edge Function de ingestión"""
        
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("❌ Error: Variables de entorno SUPABASE no configuradas")
            return False
        
        ingest_url = f"{SUPABASE_URL}/functions/v1/ingest-doc"
        
        payload = {
            'title': document['title'],
            'content': document['content'],
            'source_url': document['url'],
            'source_type': document['source_type'],
            'source_name': 'Dirección del Trabajo - Chile',
            'category': document['category'],
            'metadata': {
                'spider_name': 'dt_normativas',
                'scraped_at': document.get('scraped_at', datetime.now().isoformat()),
                'word_count': document.get('word_count', 0)
            }
        }
        
        try:
            response = requests.post(
                ingest_url,
                headers={
                    'Authorization': f'Bearer {SUPABASE_KEY}',
                    'Content-Type': 'application/json'
                },
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                print(f"✅ Enviado: {document['title'][:50]}...")
                return True
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error enviando documento: {e}")
            return False
    
    def log_execution(self, status: str, items_found: int, items_processed: int, error_msg: str = None):
        """Registra la ejecución en Supabase"""
        
        if not SUPABASE_URL or not SUPABASE_KEY:
            return
        
        log_url = f"{SUPABASE_URL}/rest/v1/loy_spider_logs"
        
        payload = {
            'spider_name': 'dt_normativas',
            'source_url': NORMATIVA_URL,
            'status': status,
            'items_found': items_found,
            'items_processed': items_processed,
            'error_message': error_msg,
            'created_at': datetime.now().isoformat()
        }
        
        try:
            requests.post(
                log_url,
                headers={
                    'apikey': SUPABASE_KEY,
                    'Authorization': f'Bearer {SUPABASE_KEY}',
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                json=payload,
                timeout=10
            )
        except Exception as e:
            print(f"⚠️ Error registrando log: {e}")
    
    def run(self, max_documents: int = 5):
        """Ejecuta el spider completo"""
        print("🕷️  Iniciando Web Spider - Dirección del Trabajo")
        print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 50)
        
        try:
            # 1. Obtener lista de normativas
            documents = self.extract_normativas()
            
            if not documents:
                print("⚠️ No se encontraron documentos")
                self.log_execution('error', 0, 0, 'No se encontraron documentos')
                return
            
            print(f"📋 Procesando máximo {max_documents} documentos...")
            
            # 2. Procesar cada documento
            processed = 0
            for i, doc in enumerate(documents[:max_documents]):
                print(f"\n🔍 [{i+1}/{min(len(documents), max_documents)}] {doc['title'][:60]}...")
                
                # Extraer contenido
                content_data = self.extract_document_content(doc['url'])
                if content_data:
                    doc.update(content_data)
                    
                    # Enviar a ingestión
                    if self.send_to_ingest(doc):
                        processed += 1
                
                # Delay entre requests para no sobrecargar el servidor
                import time
                time.sleep(2)
            
            # 3. Registrar éxito
            print(f"\n✅ Spider completado: {processed}/{len(documents[:max_documents])} documentos procesados")
            self.log_execution('success', len(documents), processed)
            
        except Exception as e:
            print(f"\n❌ Error crítico: {e}")
            self.log_execution('error', 0, 0, str(e))


def main():
    """Función principal"""
    print("=" * 60)
    print("LOY - Web Spider Dirección del Trabajo")
    print("=" * 60)
    
    # Verificar dependencias
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        print("❌ Error: Instala dependencias: pip install requests beautifulsoup4")
        return
    
    # Verificar variables de entorno
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️  Advertencia: Variables SUPABASE no configuradas")
        print("   Configura: SUPABASE_URL y SUPABASE_ANON_KEY")
        print("   El spider no podrá enviar documentos al sistema LOY")
    
    # Ejecutar spider
    spider = DTSpider()
    spider.run(max_documents=3)  # Limitado a 3 para pruebas iniciales


if __name__ == '__main__':
    main()
