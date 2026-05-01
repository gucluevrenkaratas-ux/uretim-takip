# ◈ Üretim Takip — Kurulum Rehberi

Sipariş ve galvaniz işlem yönetim uygulaması.  
**Stack:** React + Vite + Supabase + Vercel

---

## Adım 1 — Supabase Kurulumu (Veritabanı)

1. **[supabase.com](https://supabase.com)** adresine gidin → **Start for free**
2. GitHub ile giriş yapın
3. **New project** → proje adı girin (örn: `uretim-takip`) → şifre belirleyin → **Create new project**
4. Proje açılınca sol menüden **SQL Editor** → **New Query**
5. `supabase_schema.sql` dosyasının içeriğini yapıştırın → **Run**
6. Sol menüden **Project Settings** → **API** bölümüne gidin
7. Şunları kopyalayın:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** key → `eyJ...`

---

## Adım 2 — GitHub'a Yükleme

1. **[github.com](https://github.com)** → **New repository**
2. Repository adı: `uretim-takip` → **Create repository**
3. Bilgisayarınızda terminal açın, proje klasörüne gidin:

```bash
cd uretim-takip
git init
git add .
git commit -m "ilk yükleme"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/uretim-takip.git
git push -u origin main
```

> **Not:** GitHub Desktop kullanıyorsanız: File → Add Local Repository → klasörü seçin → Publish repository

---

## Adım 3 — Vercel Deploy

1. **[vercel.com](https://vercel.com)** → GitHub ile giriş yapın
2. **Add New Project** → `uretim-takip` reposunu seçin → **Import**
3. **Environment Variables** bölümüne aşağıdakileri ekleyin:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Supabase'den kopyaladığınız URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase'den kopyaladığınız anon key |

4. **Deploy** butonuna basın — 2-3 dakika bekleyin
5. Vercel size bir URL verir: `https://uretim-takip-xxx.vercel.app`

---

## Varsayılan Kullanıcılar

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| `admin` | `admin123` | Yönetici |
| `ali` | `1234` | Kullanıcı |
| `ayse` | `1234` | Kullanıcı |
| `mehmet` | `1234` | Kullanıcı |
| `zeynep` | `1234` | Kullanıcı |

> ⚠️ Deploy sonrası Admin panelinden şifreleri değiştirmeyi unutmayın!

---

## Güncelleme Yapmak

Kod değişikliği yaptığınızda:

```bash
git add .
git commit -m "güncelleme açıklaması"
git push
```

Vercel otomatik olarak yeniden deploy eder.

---

## Yerel Geliştirme (Opsiyonel)

```bash
npm install
cp .env.example .env
# .env dosyasını Supabase bilgileriyle doldurun
npm run dev
```

`http://localhost:5173` adresinde çalışır.

