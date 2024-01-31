import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  public Name = 'MidhunJith MJ';
  public Count = 0;

  public ngOnInit()
  {
    this.Name = "MidhunJith (MJ)"
    this.SiteData.Height = '70'
    this.SiteData.Width = '70'
  } 

  SiteData = {
    LogoImage : 'favicon.ico',
    PhotoOne : 'Path',
    Width : '',
    Height : ''
  }

  public textAlignment()
  {
    return "center";
  }

  public ButnClick(isAdd : boolean)
  {
    if(isAdd)
     this.Count++;
    else
     this.Count--;
    return this.Count;
  }
}
