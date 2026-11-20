namespace LastTurn.Core
{
  // Yalnız sürüş kararı. Aynı fizik ve parça kurulumu kullanılır.
  public sealed class RivalDrivingStyle
  {
    public readonly string Name,Description;
    public readonly double Headway,PassingMargin,LaneRate,CurveLimit,BrakePreview,LookScale,Pace,ThrottleCap;
    public RivalDrivingStyle(string name,string description,double headway,double margin,double laneRate,double curveLimit,double brakePreview,double lookScale,double pace=1,double throttleCap=1)
    {Name=name;Description=description;Headway=headway;PassingMargin=margin;LaneRate=laneRate;CurveLimit=curveLimit;BrakePreview=brakePreview;LookScale=lookScale;Pace=pace;ThrottleCap=throttleCap;}
    public static readonly RivalDrivingStyle Doruk=new RivalDrivingStyle("DORUK","Geç frenler, küçük boşlukları değerlendirir.",.34,.35,1.5,.008,.85,.95);
    public static readonly RivalDrivingStyle Ece=new RivalDrivingStyle("ECE","Erken hazırlanır, temiz çizgi ve geniş boşluk arar.",.62,.7,.95,.005,1.3,1.1);
    public static readonly RivalDrivingStyle Bora=new RivalDrivingStyle("BORA","Düzlükte sabırlıdır, boşalan geçiş yolunu kullanır.",.46,.5,1.2,.006,1.05,1);
    public static RivalDrivingStyle For(int index)=>index==0?Doruk:index==1?Ece:Bora;
  }
}
