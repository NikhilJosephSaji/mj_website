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

  public ngOnInit()
  {
   
  } 

  SiteData = {
    LogoImage : 'favicon.ico',
    PhotoOne : 'Path',
    Width : '70',
    Height : '70'
  }
}
