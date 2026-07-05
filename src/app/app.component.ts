import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminDataService, CategoryKey } from './admin/admin-data.service';


export interface PortfolioItem {
  id: number;
  title: string;
  category: 'weddings' | 'cinematic' | 'portraits' | 'destination';
  categoryLabel: string;
  image: string;
  location: string;
  videoUrl?: string;
  description: string;
}

export interface Testimonial {
  id: number;
  coupleName: string;
  location: string;
  quote: string;
  role: string;
  avatar: string;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private isBrowser: boolean;
  title = 'Films by MJ';
  instagramUrl = 'https://www.instagram.com/films.by.mj/';

  // Navigation state
  isMobileMenuOpen = false;
  isScrolled = false;

  // Active Category Filter
  activeCategory: string = 'all';

  // Lightbox Modal state
  activeLightboxItem: PortfolioItem | null = null;
  activeVideoUrl: string | null = null;

  // Booking Form State
  bookingForm = {
    name: '',
    email: '',
    phone: '',
    eventType: 'Wedding Film',
    eventDate: '',
    location: '',
    message: ''
  };
  formSubmitted = false;
  submitMessage = '';

  // ── Secret 5-click admin trigger ─────────────────────────────────
  heroClickCount = 0;  // public so template can read it
  private heroClickTimer: any;

  constructor(
    private adminService: AdminDataService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  heroBgUrl = 'assets/images/hero.png';

  ngOnInit() {
    this.loadPortfolioItems();
    this.loadHeroBg();
  }

  loadHeroBg() {
    this.adminService.getHeroBg().subscribe({
      next: bg => {
        if (bg) this.heroBgUrl = bg;
      }
    });
  }

  onHeroClick() {
    this.heroClickCount++;
    clearTimeout(this.heroClickTimer);
    if (this.heroClickCount >= 5) {
      this.heroClickCount = 0;
      // Use both router + fallback to ensure navigation works
      this.router.navigate(['/admin/login']).then(success => {
        if (!success) {
          window.location.href = '/admin/login';
        }
      }).catch(() => {
        window.location.href = '/admin/login';
      });
      return;
    }
    // Reset after 2.5 seconds of inactivity
    this.heroClickTimer = setTimeout(() => { this.heroClickCount = 0; }, 2500);
  }

  // ── Default fallback portfolio items ─────────────────────────────
  private defaultPortfolioItems: PortfolioItem[] = [
    {
      id: 1,
      title: 'Eternal Grace at Sunset',
      category: 'weddings',
      categoryLabel: 'Cinematic Wedding Film',
      image: 'assets/images/hero.png',
      location: 'Udaipur, Rajasthan',
      description: 'A breathtaking celebration of love amidst golden heritage lakes.',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: 2,
      title: 'Soulful Bride & Shadows',
      category: 'portraits',
      categoryLabel: 'Candid Portraiture',
      image: 'assets/images/portrait.png',
      location: 'Kochi, Kerala',
      description: 'Capturing quiet, intimate emotional glances before stepping down the aisle.'
    },
    {
      id: 3,
      title: 'Whispering Pines & Mountain Trails',
      category: 'destination',
      categoryLabel: 'Destination Story',
      image: 'assets/images/destination.png',
      location: 'Manali, Himachal Pradesh',
      description: 'An ethereal pre-wedding love story shot across misty pine forest slopes.'
    },
    {
      id: 4,
      title: 'The Royal Heritage Teaser',
      category: 'cinematic',
      categoryLabel: 'Cinematic Reel',
      image: 'assets/images/hero.png',
      location: 'Jaipur, Rajasthan',
      description: 'Slow-motion 4K anamorphic frames capturing royal grandeur and heartfelt emotion.'
    },
    {
      id: 5,
      title: 'Monsoon Romance & Whispers',
      category: 'weddings',
      categoryLabel: 'Wedding Story',
      image: 'assets/images/portrait.png',
      location: 'Wayand, Kerala',
      description: 'Atmospheric rain-soaked moments filled with candid giggles and soulful promises.'
    },
    {
      id: 6,
      title: 'Cinematic Wanderlust',
      category: 'destination',
      categoryLabel: 'Destination Film',
      image: 'assets/images/destination.png',
      location: 'Available Worldwide',
      description: 'Traveling across borders to craft timeless visual legacies.'
    }
  ];

  portfolioItems: PortfolioItem[] = [];

  loadPortfolioItems() {
    this.adminService.getAllImages().subscribe({
      next: adminImages => {
        if (adminImages.length > 0) {
          this.portfolioItems = adminImages.map(img => ({
            id: img.addedAt,
            title: img.title,
            category: this.mapCategory(img.category),
            categoryLabel: img.categoryLabel,
            image: img.path,          // real file path served as static asset
            location: img.location,
            description: img.description,
            videoUrl: img.videoUrl ?? undefined
          }));
        } else {
          this.portfolioItems = [...this.defaultPortfolioItems];
        }
      },
      error: () => {
        // API not yet available — use defaults
        this.portfolioItems = [...this.defaultPortfolioItems];
      }
    });
  }

  private mapCategory(key: CategoryKey): 'weddings' | 'cinematic' | 'portraits' | 'destination' {
    const map: Record<CategoryKey, 'weddings' | 'cinematic' | 'portraits' | 'destination'> = {
      'wedding-films':  'weddings',
      'portraits':      'portraits',
      'destination':    'destination',
      'cinematic-reels':'cinematic',
    };
    return map[key];
  }


  // Testimonials
  testimonials: Testimonial[] = [
    {
      id: 1,
      coupleName: 'Arjun & Ananya',
      location: 'Palace Grounds, Bengaluru',
      quote: 'Midhun and the Films by MJ team did not just record our wedding—they turned our real emotions into a timeless movie masterpiece! Every time we watch our teaser, we get goosebumps.',
      role: 'Bride & Groom',
      avatar: 'assets/images/hero.png'
    },
    {
      id: 2,
      coupleName: 'Rohan & Sneha',
      location: 'Fort Kochi Beach Front',
      quote: 'Midhun has a rare gift for being completely non-intrusive while capturing the most soulful, candid frames. The color palette and musical score felt straight out of modern cinema.',
      role: 'Bride & Groom',
      avatar: 'assets/images/portrait.png'
    },
    {
      id: 3,
      coupleName: 'Vikram & Meera',
      location: 'Destination Wedding, Bali',
      quote: 'From Manali to Bali, Midhun made our destination film feel so personal and magical. Best decision we made for our big day!',
      role: 'Bride & Groom',
      avatar: 'assets/images/destination.png'
    }
  ];

  // FAQs
  faqs = [
    {
      q: 'Where are Films by MJ located and do you travel?',
      a: 'We are based out of South India, but we are Available Worldwide! We travel across India and internationally to document destination weddings and special stories.',
      open: false
    },
    {
      q: 'What is your photography and filmmaking style?',
      a: 'Our signature style is Candid, Soulful, and Personal. We blend cinematic storytelling with unscripted, natural moments so your film feels genuine, emotional, and timeless.',
      open: false
    },
    {
      q: 'How far in advance should we book?',
      a: 'Because we limit the number of weddings we capture each season to maintain high artistic quality, we recommend booking 6 to 12 months in advance.',
      open: false
    },
    {
      q: 'What deliverables do we receive?',
      a: 'You receive a high-definition Cinematic Teaser (1-3 min), a Feature Wedding Film (15-30 min), full HD raw video archives, and high-resolution color-graded candid photo galleries.',
      open: false
    }
  ];

  get filteredPortfolio(): PortfolioItem[] {
    if (this.activeCategory === 'all') {
      return this.portfolioItems;
    }
    return this.portfolioItems.filter(item => item.category === this.activeCategory);
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  openLightbox(item: PortfolioItem) {
    this.activeLightboxItem = item;
  }

  closeLightbox() {
    this.activeLightboxItem = null;
  }

  openVideoModal(url: string | undefined, event?: Event) {
    if (event) event.stopPropagation();
    if (url) {
      this.activeVideoUrl = url;
    } else {
      // Default video preview placeholder
      this.activeVideoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    }
  }

  closeVideoModal() {
    this.activeVideoUrl = null;
  }

  toggleFaq(index: number) {
    this.faqs[index].open = !this.faqs[index].open;
  }

  onBookingSubmit() {
    if (!this.bookingForm.name || !this.bookingForm.email) {
      alert('Please fill out your Name and Email address.');
      return;
    }
    this.formSubmitted = true;
    this.submitMessage = `Thank you, ${this.bookingForm.name}! Midhun will reach out to you shortly to craft your magic.`;
    
    // Reset form after delay
    setTimeout(() => {
      this.bookingForm = {
        name: '',
        email: '',
        phone: '',
        eventType: 'Wedding Film',
        eventDate: '',
        location: '',
        message: ''
      };
      this.formSubmitted = false;
    }, 6000);
  }
}
