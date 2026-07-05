import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type CategoryKey = 'wedding-films' | 'portraits' | 'destination' | 'cinematic-reels';

export interface AdminImage {
  id: string;
  filename: string;
  path: string;          // e.g. "assets/images/Wedding Films/bride.jpg"
  title: string;
  category: CategoryKey;
  categoryLabel: string;
  description: string;
  location: string;
  videoUrl?: string | null;
  addedAt: number;
}

export const CATEGORIES: { key: CategoryKey; label: string; folder: string }[] = [
  { key: 'wedding-films',   label: 'Wedding Films',   folder: 'Wedding Films'   },
  { key: 'portraits',       label: 'Portraits',       folder: 'Portraits'       },
  { key: 'destination',     label: 'Destination',     folder: 'Destination'     },
  { key: 'cinematic-reels', label: 'Cinematic Reels', folder: 'Cinematic Reels' },
];

const SESSION_KEY     = 'mj_admin_session';
const ADMIN_PASSWORD  = 'mjadmin2024';

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ── Auth (localStorage is fine for session flag) ──────────────────────

  login(password: string): boolean {
    if (password === ADMIN_PASSWORD) {
      if (this.isBrowser) localStorage.setItem(SESSION_KEY, 'true');
      return true;
    }
    return false;
  }

  logout(): void {
    if (this.isBrowser) localStorage.removeItem(SESSION_KEY);
  }

  isLoggedIn(): boolean {
    return this.isBrowser ? localStorage.getItem(SESSION_KEY) === 'true' : false;
  }

  // ── Images API ────────────────────────────────────────────────────────

  getAllImages(): Observable<AdminImage[]> {
    return this.http.get<{ images: AdminImage[] }>('/api/images').pipe(
      map(r => r.images),
      catchError(() => of([]))
    );
  }

  getImagesByCategory(category: CategoryKey): Observable<AdminImage[]> {
    return this.http.get<{ images: AdminImage[] }>(`/api/images?category=${category}`).pipe(
      map(r => r.images),
      catchError(() => of([]))
    );
  }

  uploadImage(formData: FormData): Observable<AdminImage> {
    return this.http.post<{ image: AdminImage }>('/api/upload', formData).pipe(
      map(r => r.image)
    );
  }

  updateImage(id: string, updates: Partial<Pick<AdminImage, 'title' | 'description' | 'location' | 'videoUrl'>>): Observable<AdminImage> {
    return this.http.put<{ image: AdminImage }>(`/api/images/${id}`, updates).pipe(
      map(r => r.image)
    );
  }

  deleteImage(id: string): Observable<void> {
    return this.http.delete<void>(`/api/images/${id}`);
  }

  // ── Hero Background API ───────────────────────────────────────────────

  getHeroBg(): Observable<string> {
    return this.http.get<{ heroBg: string }>('/api/hero-bg').pipe(
      map(r => r.heroBg),
      catchError(() => of('assets/images/hero.png'))
    );
  }

  uploadHeroBg(formData: FormData): Observable<string> {
    return this.http.post<{ heroBg: string }>('/api/hero-bg', formData).pipe(
      map(r => r.heroBg)
    );
  }
}
