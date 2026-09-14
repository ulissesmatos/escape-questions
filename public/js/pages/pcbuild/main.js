import { SiteHeader } from '../../components/SiteHeader.js';
import { PcBuildPage } from './PcBuildPage.js';

SiteHeader.montarNaPagina();
new PcBuildPage(document.getElementById('app')).iniciar();
