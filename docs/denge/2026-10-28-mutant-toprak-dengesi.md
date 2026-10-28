# 2026-10-28 MUTANT toprak dengesi ve yarış lastiği (0.8.13)

Kural: MUTANT'ta lastik × araç toprak tutuşu 1'in altındaysa açığın %55'i kalır (`toprakDengesi`, `TOPRAK_ACIK_PAYI`). MUTANT yarışlarında yarış lastiği takılmaz: araç kendi lastiğiyle yarışır (rakip de). Kariyer değişmedi.

Ölçüm: düz zeminde R=30 m daireyi tutabilen en yüksek hız (5 km/sa adım; motor gücü üst sınırı olabilir), lk=norm, aracın kendi lastiği.

```
Kızıl Ok        Yarış   birleşik 0.40→0.67  toprak daire 65→85 km/sa  asfalt 110
Kor RX          Toprak  birleşik 1.40→1.40  toprak daire 105→105 km/sa  asfalt 95
Beyaz Kurt      Drift   birleşik 0.31→0.62  toprak daire 50→70 km/sa  asfalt 75
Mavi Yıldız     Toprak  birleşik 1.47→1.47  toprak daire 95→95 km/sa  asfalt 90
Gece Mavisi     Yarış   birleşik 0.36→0.65  toprak daire 45→75 km/sa  asfalt 95
Gri Atmaca      Yarış   birleşik 0.38→0.66  toprak daire 65→90 km/sa  asfalt 110
Kum Fırtınası   Toprak  birleşik 1.44→1.44  toprak daire 105→105 km/sa  asfalt 90
Sarı Arı        Toprak  birleşik 1.47→1.47  toprak daire 105→105 km/sa  asfalt 90
Panda           Drift   birleşik 0.34→0.64  toprak daire 50→65 km/sa  asfalt 75
Turuncu Ejder   Yarış   birleşik 0.37→0.65  toprak daire 50→75 km/sa  asfalt 100
Gümüş Serçe     Yarış   birleşik 0.32→0.62  toprak daire 40→65 km/sa  asfalt 70
Bozkır Tavşanı  Toprak  birleşik 0.71→0.84  toprak daire 70→70 km/sa  asfalt 70
Haki Keçi       Toprak  birleşik 0.81→0.90  toprak daire 65→65 km/sa  asfalt 65
Bordo Tilki     Drift   birleşik 0.63→0.79  toprak daire 70→70 km/sa  asfalt 75
Kara Boğa       Yarış   birleşik 0.23→0.57  toprak daire 25→60 km/sa  asfalt 95
```

Drag başlangıç aracı (Kara Boğa) kendi lastiğiyle 8 drag pistinde drag lastiğiyle aynı süreyi yapar (fark ≤ 0,3 sn): MUTANT_REFERANS dg değerleri geçerli. Diğer türlerin başlangıç araçlarının önayar lastiği o türün yarış lastiğiyle aynı.
