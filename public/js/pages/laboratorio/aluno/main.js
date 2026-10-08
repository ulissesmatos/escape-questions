import { SiteHeader } from '../../../components/SiteHeader.js';
import { AlunoApp } from './AlunoApp.js';

SiteHeader.montarNaPagina();
new AlunoApp(document.getElementById('app')).iniciar();
