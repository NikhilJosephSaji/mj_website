import { bootstrapApplication } from '@angular/platform-browser';
import { AppShellComponent } from './app/app-shell.component';
import { config } from './app/app.config.server';

const bootstrap = () => bootstrapApplication(AppShellComponent, config);

export default bootstrap;
