# Toshiba / Vestel SDX Kanal Düzenleyici

Tarayıcıda çalışan, Toshiba ve Vestel televizyonların SatcoDX (`.sdx`) kanal listelerini düzenlemek için hazırlanmış yerel bir araçtır.

## Özellikler

- `.sdx` dosyalarını tarayıcı içinde okur; dosya bir sunucuya gönderilmez.
- `SATCODX103` ve `SATCODX105` kayıtlarını ham biçimde korur.
- TV ve radyo kanallarını tablo halinde gösterir.
- Kanal adı, frekans, sembol oranı, uydu, servis kimliği ve çözünürlük gibi tespit edilebilen bilgileri gösterir.
- Kanal sıralarını sürükle-bırakla değiştirir.
- Arama, tür filtreleme ve çoklu seçim destekler.
- Sayfa başına 10, 20, 50 veya 100 kayıt gösterir; SDX sıra numarasını görünür kılar.
- Aynı adlı kayıtlar için aday karşılaştırması sunar.
- Düzenlenen listeyi `.sdx` olarak indirir.

## Kullanım

1. Televizyondan aldığınız `.sdx` dosyasını uygulamaya yükleyin.
2. Kanalları arayın, seçin veya sürükleyerek sıralayın.
3. Gerekirse sayfa başına gösterilecek kayıt sayısını değiştirin.
4. **SDX indir** ile yeni listeyi kaydedin.
5. Dosyayı USB üzerinden televizyona geri aktarın.

> Televizyon üzerinde içe aktarma testi yapmadan ana kanal listenizin tek kopyasını değiştirmeyin; orijinal `.sdx` dosyasını saklayın.

## Geliştirme

Node.js ve pnpm ile:

```bash
pnpm install
pnpm dev
```

Kontroller:

```bash
pnpm test
pnpm build
```

## Notlar

Kayıt yeniden sıralanırken her kanalın ham SDX baytları korunur. Bu proje Toshiba/Vestel cihazlarıyla doğrulanmak üzere tasarlanmıştır; farklı cihaz yazılımı sürümlerinde içe aktarmadan önce yedek alınmalıdır.
