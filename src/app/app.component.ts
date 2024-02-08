import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {CommonModule} from '@angular/common';
import { Console } from 'console';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,FormsModule,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  public Name = 'MidhunJith MJ';
  public Count = 0;
  public strContent : string = '';

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

  public alignment()
  {
    return "center";
  }

  public ButnClick(isAdd : boolean)
  {
    if(isAdd)
     this.Count++;
    else
     this.Count--;
    console.log(this.Count);    
    return this.Count;
  }

  public Fruits =
    [
      {
        "name" : "Apple",
        "image" : "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/265px-Red_Apple.jpg",
        "price" : 35
      },
      {
        "name" : "Banana",
        "image" : "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Bananas_white_background_DS.jpg/320px-Bananas_white_background_DS.jpg",
        "price" : 12
      },
      {
        "name" : "Grapes",
        "image" : "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Table_grapes_on_white.jpg/320px-Table_grapes_on_white.jpg",
        "weight": 0.1,
        "price" : 45
      },
      {
        "name" : "Pineapple",
        "image" : "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Pineapple_and_cross_section.jpg/286px-Pineapple_and_cross_section.jpg",
        "price" : 200
      }
    ]
  }
