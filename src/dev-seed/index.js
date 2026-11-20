import { articles } from './data/articles.js';
import { customOrderSteps } from './data/customOrder.js';
import { karyaData } from './data/karya.js';
import { pameranData } from './data/pameran.js';
import { siteSettings } from './data/siteSettings.js';
import studioPortrait from './assets/images/image 12.webp';

export { articles, customOrderSteps, karyaData, pameranData, siteSettings, studioPortrait };

export const LOCAL_ACCOUNTS = [
  {
    id: 'usr-owner',
    email: 'studio@husennursidik.art',
    name: 'Husen Nursidik',
    role: 'OWNER',
  },
  {
    id: 'usr-admin',
    email: 'admin@husennursidik.art',
    name: 'Admin Studio',
    role: 'ADMIN',
  },
];
