# 2026-10-28 MUTANT drift yarışı tutma ölçümü (0.8.12)

Düz asfalt, lk=norm, insan benzeri sürücü (0,1/0,2/0,3 sn gecikme × analog/tuş), 25° hedef. Hücre: hedefte% / driftte%.
Sütunlar: stok, +drift lastiği, +kilitli dif, +açı kiti (drift paketi), +drift süspansiyonu, +arkadan itiş. Seçilen destek: 0,3 + 0,7·kontrol^1,5.

```
lk=norm DA=0.3 DB=0.7 DP=1.5  merdiven: stok, +lastik, +kilitli dif, +açı kiti (paket), +drift süsp, +arka çekiş; skor = hedefte% ort (gecikme .1/.2/.3 × analog/tuş) | driftte%
Kızıl Ok        awd=0     31/ 64   73/ 87   54/ 82   58/ 83   58/ 83   58/ 83
Kor RX          awd=0.45  70/ 88   77/ 93   64/ 86   63/ 85   63/ 85   39/ 74
Beyaz Kurt      awd=0     49/ 80   49/ 80   44/ 74   54/ 80   54/ 80   54/ 80
Mavi Yıldız     awd=0.5   71/ 89   85/ 96   63/ 86   63/ 86   62/ 86   67/ 84
Gece Mavisi     awd=0     37/ 72   28/ 60   64/ 84   65/ 83   65/ 84   65/ 84
Gri Atmaca      awd=0     31/ 66   79/ 91   57/ 85   61/ 84   61/ 84   61/ 84
Kum Fırtınası   awd=0.4   77/ 92   90/ 98   61/ 86   62/ 86   62/ 86   51/ 83
Sarı Arı        awd=0.47  81/ 92   97/100   65/ 87   62/ 86   62/ 86   65/ 83
Panda           awd=0     41/ 68   41/ 68   40/ 69   44/ 76   44/ 77   44/ 77
Turuncu Ejder   awd=0      9/ 66   19/ 40   51/ 77   53/ 81   53/ 81   53/ 81
Gümüş Serçe     awd=0     18/ 43   62/ 71   67/ 85   66/ 84   66/ 84   66/ 84
Bozkır Tavşanı  awd=0.5   29/ 66   28/ 67   28/ 35   39/ 48   40/ 50   64/ 77
Haki Keçi       awd=0.5   24/ 63   25/ 70   60/ 67   44/ 51   43/ 48   65/ 77
Bordo Tilki     awd=0     47/ 57   47/ 57   38/ 53   62/ 78   61/ 78   61/ 78
Kara Boğa       awd=0      0/ 66   34/ 88   66/ 87   66/ 85   66/ 85   66/ 85
```

Önceki durum (0.8.11): stok hâliyle 9 araç gaz+direksiyonla drifte hiç giremiyordu (el freniyle girebiliyordu).
