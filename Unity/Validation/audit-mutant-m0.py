"""M0 kaynak dökümü; katalog/sayı değiştirmez, ağ ve Unity gerektirmez."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "Unity/Assets/LastTurn/Resources/mutant-catalog.json"
c = json.loads(CATALOG.read_text(encoding="utf-8"))
lines = ["# Mutant 2.0 — M0 mekanik kataloğu ve etkileşim matrisi", "",
         "7 Kasım 2026. `python Unity/Validation/audit-mutant-m0.py` ile gerçek katalogdan üretilir.",
         "Kaynak SHA-256: `" + hashlib.sha256(CATALOG.read_bytes()).hexdigest() + "`.", "",
         "Metinler katalog tanımıdır; her açıklama çalışma zamanı davranışının kanıtı değildir. "
         "Uygulama sınırları ve tasarım kararları [M0 sözleşmesinde](mutant-2-m0.md).", ""]


def cell(value):
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return str(value).replace("|", "\\|").replace("\n", " ")


def table(headers, rows):
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("|" + "---|" * len(headers))
    for row in rows:
        lines.append("| " + " | ".join(cell(v) for v in row) + " |")
    lines.append("")


for key, title in [("passives", "31 pasif"), ("addons", "6 sandık eklentisi")]:
    lines.extend(["## " + title, ""])
    table(["Kimlik / ad", "Sonuç / dönüştürme", "Tetik / kaynak", "Sınır / etkileşim"],
          [(f"`{p['id']}` / {p['ad']}", p["d"],
            p.get("m", {}).get("tetik", "Olay tanımı yok; Run/Vehicle sayacı veya parametre değiştirici"),
            {"en": p["en"], **({"m": p["m"]} if "m" in p else {}),
             **({"eski_nadir": p["nadir"]} if "nadir" in p else {})}) for p in c[key]])

lines.extend(["## 5 skill, 15 seviye ve 5 evrim", ""])
table(["Kimlik / tür / etiket", "Sonuç / etkileşim", "Kaynak ve sınırlar (seviye 1/2/3)", "Evrim"],
      [(f"`{s['id']}` / {s['tur']} / {','.join(s['etiketler'])}", s["d"],
        s["seviyeler"], s["evrimler"]) for s in c["skills"]])
lines += ["Skill kaynağı enerji değildir: aktifler süre/bekleme veya kanca şarjı; tetikliler risk/takip barı kullanır. "
          "Yuva 3, seviye 3, eklenti 2; pasif en sayısı skill seviyesi değildir.", ""]
lines.extend(["## 2 skill eklentisi", ""])
table(["Kimlik", "Tetik", "Sonuç", "Uyumluluk / sınır"],
      [(s["id"], s["olay"], s["d"], f"{s['etiket']}; {s['sure']} sn; kaynak skill başına en çok 2 farklı eklenti") for s in c["skillAddons"]])
lines.extend(["## 42 mekanik parça (atölye)", "",
              "Bütün parçalar aşağıda; stok yalnız sv>0, sahip olunmayan ve motor-degisim olmayanları alır. "
              "Parça etkisi katalog e alanı; uygulanışı VehicleCatalog/MutantVehicle. sv nadirlik değildir.", ""])
table(["Kimlik / ad", "Kategori / basamak", "Etki"],
      [(f"{p['id']} / {p.get('ad','')}", f"{p.get('kat','')} / {p['sv']}", p.get("e", {})) for p in c["parts"]])
lines.extend(["## Olay bağlantı matrisi (uygulanmış / sınır / boşluk)", ""])
table(["Üretici", "Ortak olay / değer", "Tüketici", "Durum ve sınır"], [
    ("Bilinçli drift", "DriftTickQualified", "Temel enerji + drift-harvester + risk-taker", "Çalışıyor; eşikler farklı; skill risk barı enerji değildir"),
    ("Drift sonu/başlangıcı", "DriftEnded / DriftStarted", "temiz-cikis / kayma-hafizasi / ek-kizgin-egzoz", "Çalışıyor; temiz süre, 180 adım zincir, 90 adım bekleme"),
    ("Yerde hızlı sürüş", "SurusTick", "hiz-dinamosu", "Çalışıyor; >=28 m/sn, yerde"),
    ("Yarışta yakın takip", "YakinTakip / NearMiss", "takip-dinamosu / risk-taker / slipstream-engine", "Çalışıyor; hedef başına 4 sn kredi, dışarıda .25/sn dolar; NearMiss 180 adım"),
    ("Gerçek hasar", "HasarAlindi", "carpisma-pili / ek-hasar-donusturucu / hurdaci", "Enerji ve para farklı katmanlarda; hurdacı tamirinden az iade"),
    ("Hayaletin engellediği hasar", "KorumaEngelledi", "kalkan-bataryasi", "Çalışıyor; aynı çarpışmayı tekrar göndermemek Session görevi"),
    ("Riskli etkinlik başlangıcı", "RiskBasladi", "risk-kondansatoru", "Çalışıyor; >=1; serbest tekrar ile bedava 40 riski adaptör girişinde denetlenmeli"),
    ("Kanca", "KonumEtkisi", "sok-bobini → elektrik → rakip fren", "Çalışıyor; konum etiketli skill; kancanın rakip hedefi"),
    ("Risk alev izi", "HasarVerildi", "kor-cekirdegi → ates → hasar-bataryasi", "Çalışıyor; 10 hasar/hedef/adım, vuruş aralığı, 15 adım enerji beklemesi"),
    ("Skill/durum çıktısı", "bekleyenBeceri", "Sonraki sabit adımın enerji mekanikleri", "Çalışıyor; çerçeveler arasında tam kök/nedensellik zarfı yok"),
    ("Enerji üretimi", "EnergyGained", "Veri tanımı ile eklenebilir", "Üretim var, mevcut katalogda dinleyici YOK; kendine dönüş + adım başına bir tetik, derinlik3/işlem64"),
    ("Enerji", "AbilityActivated(nitro)", "nitro → güç", "Çalışıyor; 40 maliyet, 2.5 sn etki, ardından4 sn; değiştiriciler ayrı"),
    ("Nitro", "güç / aktif durum", "nitro-kalkani → hasar yarıya", "Çalışıyor; nitro → tutuş olayı katalogda yok"),
    ("Tutuş / güç / uçuş", "Araç kurulumu / fizik girdisi", "Sonraki fizik → drift / yakınlık", "Dolaylı fizik döngüsü var; tutuş değişti olayı ve genel kaynak dönüşüm grafiği yok"),
    ("Yarış / boss / sandık", "Run komutları", "para/XP/seçim/pasif/parça", "Tekrar ödül önlemleri var; genel ödül metadata/rarity API yok"),
])
lines.extend(["## Boss matrisi — metin ile gerçek AI ayrı", ""])
table(["Boss / tür", "Katalog vaadi / zayıflığı", "Gerçek altyapı", "Taktik değerlendirme (ölçüm değil)"],
      [(f"{b['ad']} / {b['ty']}", f"{b['yetenekler']} / {b['zayif']}",
        "Drift: puan hedefi; fiziksel boss rakibi yok" if b["ty"] == "dp" else
        f"Ortak boss pilotu; araç {dict(gp=10,rx=11,rl=12,dg=14)[b['ty']]}; bölgeye göre 3 kurulum; hava={b.get('hava','normal')}; gece={b.get('gece',False)}",
        dict(rl="Toprak kontrolü/çizgi; tek skill zorunlu değil", dp="Kontrollü uzun drift; uçuş her zaman avantaj değil",
             dg="Kalkış/çekiş ve doğru nitro; özgün son metre nitro AI henüz yok", gp="Fren noktası ve viraj çizgisi; elektrik/kanca rakibi etkileyebilir",
             rx="Islak karışık zemin/çekiş; ortak tutuş fiziği geçerli")[b["ty"]]) for b in c["bosses"]])
lines += ["Boss açıklamaları özel davranış ağacı değildir. Boss'a göre skill karşılıkları/reaksiyon politikası yok; "
          "ortak OpponentPilot çizgi/hız/kişilik ve MutantOpponentLink etkileri kullanılır.", ""]
out = ROOT / "docs/tasarim/mutant-2-matris.md"
out.write_text("\n".join(lines), encoding="utf-8")
print("M0 kaynak matrisi: 31 pasif, 6 eklenti, 5 skill, 5 evrim, 2 skill eklentisi, 42 parça, 5 boss.")
