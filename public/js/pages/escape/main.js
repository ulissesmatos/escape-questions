import { SiteHeader } from '../../components/SiteHeader.js';
import { EscapeRoomPage } from './EscapeRoomPage.js';

SiteHeader.montarNaPagina();
new EscapeRoomPage(document.getElementById('app')).iniciar();
