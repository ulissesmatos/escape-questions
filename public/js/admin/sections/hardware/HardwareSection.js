import { AdminSection } from '../base.js';
import { AlunosTab } from './AlunosTab.js';
import { QuestoesTab } from './QuestoesTab.js';
import { MapaTab } from './MapaTab.js';

export class HardwareSection extends AdminSection {
  static id = 'hardware';
  static titulo = 'Mapa de Hardware';
  static icone = '🗺️';
  static descricao = 'Progresso adaptativo dos alunos, banco de perguntas e montagem do mapa.';
  static abas = [
    { id: 'alunos', rotulo: 'Progresso dos alunos', Classe: AlunosTab },
    { id: 'questoes', rotulo: 'Banco de perguntas', Classe: QuestoesTab },
    { id: 'mapa', rotulo: 'Mapa e níveis', Classe: MapaTab },
  ];
}
