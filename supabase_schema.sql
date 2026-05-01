-- Üretim Takip - Supabase Tablo Kurulumu
-- Supabase > SQL Editor > New Query bölümüne yapıştırın ve Run'a basın

-- Ana tablo (tüm veriler burada saklanır)
CREATE TABLE IF NOT EXISTS storage (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Herkese okuma/yazma izni (RLS kapalı — basit kullanım için)
ALTER TABLE storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes okuyabilir" ON storage
  FOR SELECT USING (true);

CREATE POLICY "Herkes yazabilir" ON storage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Herkes güncelleyebilir" ON storage
  FOR UPDATE USING (true);

-- Kurulum tamamlandı!
-- Artık uygulamanızı deploy edebilirsiniz.
