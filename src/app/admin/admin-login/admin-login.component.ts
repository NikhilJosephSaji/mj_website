import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminDataService } from '../admin-data.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  password = '';
  showPassword = false;
  error = '';
  isLoading = false;
  attempts = 0;

  constructor(private adminService: AdminDataService, private router: Router) {
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.password) {
      this.error = 'Please enter your password.';
      return;
    }
    this.isLoading = true;
    this.error = '';

    // Simulate small delay for polish
    setTimeout(() => {
      const success = this.adminService.login(this.password);
      this.isLoading = false;
      if (success) {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.attempts++;
        this.error = this.attempts >= 3
          ? 'Too many failed attempts. Please try again later.'
          : 'Incorrect password. Please try again.';
        this.password = '';
      }
    }, 700);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
