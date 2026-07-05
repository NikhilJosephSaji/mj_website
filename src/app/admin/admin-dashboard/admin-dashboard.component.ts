import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { AdminDataService, AdminImage, CATEGORIES, CategoryKey } from '../admin-data.service';

type SidebarTab = CategoryKey | 'home-bg' | 'about-photo';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  categories = CATEGORIES;
  activeTab: SidebarTab = 'wedding-films';

  images: AdminImage[] = [];
  isLoading = false;

  // ── Add form state ──────────────────────────────────────────────────
  showAddForm = false;
  newTitle = '';
  newDescription = '';
  newLocation = '';
  newVideoUrl = '';
  newImageFile: File | null = null;
  newImagePreview = '';
  isDragOver = false;
  isUploading = false;
  uploadProgress = 0;
  uploadError = '';

  // ── Edit state ──────────────────────────────────────────────────────
  editingId: string | null = null;
  editTitle = '';
  editDescription = '';
  editLocation = '';
  editVideoUrl = '';

  // ── Delete state ────────────────────────────────────────────────────
  confirmDeleteId: string | null = null;

  // ── Hero BG state ───────────────────────────────────────────────────
  currentHeroBg = 'assets/images/hero.png';
  heroBgFile: File | null = null;
  heroBgPreview = '';
  isUploadingHero = false;
  heroError = '';
  heroSuccess = '';

  // ── Toast ───────────────────────────────────────────────────────────
  toast = '';
  toastTimer: any;

  constructor(
    private adminService: AdminDataService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.loadImages();
    this.loadHeroBg();
    this.loadAboutPhoto();
  }

  // ── Tab navigation ──────────────────────────────────────────────────

  setTab(tab: SidebarTab) {
    this.activeTab = tab;
    this.cancelEdit();
    this.resetAddForm();
    if (tab !== 'home-bg' && tab !== 'about-photo') {
      this.loadImages();
    }
  }

  get isHeroBgTab(): boolean { return this.activeTab === 'home-bg'; }
  get isAboutPhotoTab(): boolean { return this.activeTab === 'about-photo'; }
  get isCategoryTab(): boolean { return this.activeTab !== 'home-bg' && this.activeTab !== 'about-photo'; }
  get activeCategoryKey(): CategoryKey { return this.activeTab as CategoryKey; }
  get activeCategoryLabel(): string {
    const cat = this.categories.find(c => c.key === this.activeTab);
    return cat ? cat.label : (this.activeTab === 'about-photo' ? 'About Midhun Photo' : 'Home Background');
  }

  getCategoryCount(key: CategoryKey): number {
    return this.images.filter(i => i.category === key).length;
  }

  // ── Load ─────────────────────────────────────────────────────────────

  loadImages() {
    if (this.isHeroBgTab || this.activeTab === 'about-photo') return;
    this.isLoading = true;
    this.adminService.getImagesByCategory(this.activeCategoryKey).subscribe({
      next: imgs => {
        this.images = imgs;
        this.isLoading = false;
        if (imgs.length === 0) {
          this.showAddForm = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.showToast('⚠️ Could not load images. Is npm start running?');
      }
    });
  }

  loadHeroBg() {
    this.adminService.getHeroBg().subscribe(bg => {
      this.currentHeroBg = bg;
      this.cdr.detectChanges();
    });
  }

  // ── File selection (drag & drop or click) ────────────────────────────

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setImageFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) this.setImageFile(file);
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragOver = true; }
  onDragLeave() { this.isDragOver = false; }

  setImageFile(file: File) {
    this.uploadError = '';
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = 'Image must be under 10MB.';
      return;
    }
    this.newImageFile = file;
    const reader = new FileReader();
    reader.onload = e => { this.newImagePreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  // ── Upload new image ─────────────────────────────────────────────────

  submitNewImage() {
    if (!this.newTitle.trim()) { this.uploadError = 'Title is required.'; return; }
    if (!this.newImageFile)   { this.uploadError = 'Please select an image.'; return; }

    const fd = new FormData();
    fd.append('category',    this.activeCategoryKey);
    fd.append('title',       this.newTitle.trim());
    fd.append('description', this.newDescription.trim());
    fd.append('location',    this.newLocation.trim() || 'India');
    fd.append('videoUrl',    this.newVideoUrl.trim());
    fd.append('image',       this.newImageFile);

    this.isUploading  = true;
    this.uploadError  = '';
    this.uploadProgress = 0;

    // Animate progress bar during upload
    const prog = setInterval(() => {
      if (this.uploadProgress < 85) this.uploadProgress += 12;
    }, 200);

    this.adminService.uploadImage(fd).subscribe({
      next: img => {
        clearInterval(prog);
        this.uploadProgress = 100;
        setTimeout(() => {
          this.isUploading = false;
          this.uploadProgress = 0;
          this.showToast('Image saved to server! ✨');
          this.resetAddForm();
          this.loadImages();
        }, 400);
      },
      error: err => {
        clearInterval(prog);
        this.isUploading = false;
        this.uploadProgress = 0;
        this.uploadError = err?.error?.error || 'Upload failed. Make sure npm start is running.';
      }
    });
  }

  resetAddForm() {
    this.showAddForm = false;
    this.newTitle = '';
    this.newDescription = '';
    this.newLocation = '';
    this.newVideoUrl = '';
    this.newImageFile = null;
    this.newImagePreview = '';
    this.uploadError = '';
    this.isUploading = false;
    this.uploadProgress = 0;
  }

  // ── Edit ─────────────────────────────────────────────────────────────

  startEdit(img: AdminImage) {
    this.editingId      = img.id;
    this.editTitle      = img.title;
    this.editDescription = img.description;
    this.editLocation   = img.location;
    this.editVideoUrl   = img.videoUrl ?? '';
  }

  saveEdit() {
    if (!this.editingId) return;
    this.adminService.updateImage(this.editingId, {
      title:       this.editTitle.trim(),
      description: this.editDescription.trim(),
      location:    this.editLocation.trim(),
      videoUrl:    this.editVideoUrl.trim() || null,
    }).subscribe({
      next: () => { this.showToast('Changes saved!'); this.cancelEdit(); this.loadImages(); },
      error: ()  => this.showToast('⚠️ Save failed.')
    });
  }

  cancelEdit() { this.editingId = null; }

  // ── Delete ───────────────────────────────────────────────────────────

  confirmDelete(id: string) { this.confirmDeleteId = id; }
  cancelDelete()             { this.confirmDeleteId = null; }

  doDelete() {
    if (!this.confirmDeleteId) return;
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;
    this.adminService.deleteImage(id).subscribe({
      next: () => { this.showToast('Image deleted from server.'); this.loadImages(); },
      error: ()  => this.showToast('⚠️ Delete failed.')
    });
  }

  // ── Hero Background ──────────────────────────────────────────────────

  onHeroFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.heroBgFile = file;
    const reader = new FileReader();
    reader.onload = e => { this.heroBgPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  applyHeroBg() {
    if (!this.heroBgFile) { this.heroError = 'Please select an image first.'; return; }
    const fd = new FormData();
    fd.append('image', this.heroBgFile);
    this.isUploadingHero = true;
    this.heroError = '';
    this.heroSuccess = '';

    this.adminService.uploadHeroBg(fd).subscribe({
      next: bg => {
        this.isUploadingHero = false;
        this.currentHeroBg   = bg + '?t=' + Date.now();
        this.heroBgFile      = null;
        this.heroBgPreview   = '';
        this.heroSuccess     = '✅ Hero background updated successfully!';
        this.showToast('Hero background updated!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isUploadingHero = false;
        this.heroError = '⚠️ Upload failed. Try again.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── About Midhun Photo ───────────────────────────────────────────────

  currentAboutPhoto: string | null = '/api/assets/midhun.jpg';
  aboutPhotoFile: File | null = null;
  aboutPhotoPreview = '';
  isUploadingAbout = false;
  aboutError = '';
  aboutSuccess = '';

  loadAboutPhoto() {
    this.adminService.getAboutPhoto().subscribe(p => {
      this.currentAboutPhoto = p ? (p + '?t=' + Date.now()) : null;
      this.cdr.detectChanges();
    });
  }

  cancelAboutPhoto() {
    this.aboutPhotoFile = null;
    this.aboutPhotoPreview = '';
    this.aboutError = '';
    this.aboutSuccess = '';
  }

  onAboutFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.aboutPhotoFile = file;
    const reader = new FileReader();
    reader.onload = e => { this.aboutPhotoPreview = e.target?.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  applyAboutPhoto() {
    if (!this.aboutPhotoFile) { this.aboutError = 'Please select an image first.'; return; }
    const fd = new FormData();
    fd.append('image', this.aboutPhotoFile);
    this.isUploadingAbout = true;
    this.aboutError = '';
    this.aboutSuccess = '';

    this.adminService.uploadAboutPhoto(fd).subscribe({
      next: photo => {
        this.isUploadingAbout = false;
        this.currentAboutPhoto = photo + '?t=' + Date.now();
        this.aboutPhotoFile = null;
        this.aboutPhotoPreview = '';
        this.aboutSuccess = '✅ Midhun’s photo updated successfully!';
        this.showToast('Bio photo updated!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUploadingAbout = false;
        this.aboutError = err?.error?.error || '⚠️ Upload failed. Please choose a valid image file.';
        this.cdr.detectChanges();
      }
    });
  }

  removeAboutPhoto() {
    if (!confirm('Are you sure you want to remove Midhun’s photo? The website will automatically use a full-width text layout.')) return;
    this.adminService.deleteAboutPhoto().subscribe({
      next: () => {
        this.currentAboutPhoto = null;
        this.showToast('Photo removed.');
        this.cdr.detectChanges();
      }
    });
  }

  cancelHeroBg() {
    this.heroBgFile    = null;
    this.heroBgPreview = '';
    this.heroError     = '';
  }

  // ── Toast ────────────────────────────────────────────────────────────

  showToast(msg: string) {
    this.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast = ''; this.cdr.detectChanges(); }, 3000);
  }

  // ── Nav ──────────────────────────────────────────────────────────────

  logout()   { this.adminService.logout(); this.router.navigate(['/admin/login']); }
  goToSite() { this.router.navigate(['/']); }
}
