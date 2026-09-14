import { SiteHeader } from '../../components/SiteHeader.js';
import { HardwarePage } from './HardwarePage.js';

SiteHeader.montarNaPagina();
new HardwarePage(document.getElementById('app')).iniciar();
