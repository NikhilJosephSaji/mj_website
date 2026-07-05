import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminDataService } from './admin-data.service';

export const adminGuard: CanActivateFn = () => {
  const adminService = inject(AdminDataService);
  const router = inject(Router);

  if (adminService.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/admin/login']);
};
