/**
 * Simula o que acontece quando o PC é ligado e passa por um teste de
 * estresse. Devolve etapas (para a animação) e o resultado final.
 *
 * Modelos simplificados, mas com a lógica real:
 *  - temperatura = 30 °C + TDP × (resistência do cooler + resistência da pasta)
 *  - consumo de pico = 80 W (resto do PC) + TDP do processador + 1,6 × consumo da placa de vídeo
 *    (placas de vídeo têm picos rápidos acima do consumo nominal)
 */
export const LIMITE_DESLIGA = 100;
export const LIMITE_QUENTE = 90;

const RESISTENCIA_PASTA = { ideal: 0.08, demais: 0.12, pouca: 0.25, nenhuma: 1.0 };

/** Tempo típico para o sistema iniciar em cada tipo de disco (em segundos) */
const INICIO_POR_DISCO = [
  { tipo: 'nvme', nome: 'SSD NVMe', segundos: 9, pontos: 600 },
  { tipo: 'ssd', nome: 'SSD SATA', segundos: 15, pontos: 350 },
  { tipo: 'hd', nome: 'HD', segundos: 42, pontos: 80 },
];

export class SimuladorTeste {
  /** O disco mais rápido que o sistema consegue usar (SATA sem cabo não conta) */
  static discoDoSistema(montagem) {
    const tipoDe = (p) => (p.interface === 'nvme' ? 'nvme' : p.ssd ? 'ssd' : 'hd');
    const usaveis = ['m2-0', 'm2-1', ...(montagem.estado.cabos.sata ? ['sata-0', 'sata-1'] : [])]
      .map((id) => montagem.pecaNo(id))
      .filter(Boolean)
      .map(tipoDe);
    return INICIO_POR_DISCO.find((d) => usaveis.includes(d.tipo)) || null;
  }

  /**
   * Pontuação de desempenho (só faz sentido com o PC funcionando): mostra ao
   * aluno quanto cada peça contribui.
   */
  static desempenho(montagem) {
    const cpu = montagem.processador();
    const gpu = montagem.placaDeVideo();
    const disco = SimuladorTeste.discoDoSistema(montagem);
    const partes = [
      { nome: 'Processador', pontos: cpu ? cpu.nucleos * 150 : 0 },
      { nome: 'Memória', pontos: Math.round(Math.min(64, montagem.ramTotalGb()) * 25 * (montagem.dualChannel() ? 1.2 : 1)) },
      { nome: 'Vídeo', pontos: gpu ? [0, 900, 1800, 3200][gpu.nivel] : cpu?.videoIntegrado ? 250 : 0 },
      { nome: 'Disco', pontos: disco ? disco.pontos : 0 },
    ];
    return { partes, total: partes.reduce((soma, p) => soma + p.pontos, 0) };
  }

  static temperatura(montagem) {
    const cpu = montagem.processador();
    if (!cpu) return 30;
    const cooler = montagem.cooler();
    if (!cooler) return 30 + cpu.tdp * 3;
    const resistenciaCooler = 30 / cooler.capacidade;
    const extraParafusos = montagem.estado.parafusosEmX ? 0 : 0.1;
    return Math.round(30 + cpu.tdp * (resistenciaCooler + RESISTENCIA_PASTA[montagem.estado.pasta] + extraParafusos));
  }

  static consumoPico(montagem) {
    const cpu = montagem.processador();
    const gpu = montagem.placaDeVideo();
    return Math.round(80 + (cpu ? cpu.tdp : 0) + (gpu ? gpu.consumo * 1.6 : 0));
  }

  static executar(montagem) {
    const etapas = [];
    const ok = (texto) => etapas.push({ tipo: 'ok', texto });
    const aviso = (texto) => etapas.push({ tipo: 'aviso', texto });
    const falha = (motivo, texto, explicacao) => {
      etapas.push({ tipo: 'erro', texto });
      return { sucesso: false, motivo, explicacao, etapas, temperatura: null, consumoPico: SimuladorTeste.consumoPico(montagem) };
    };

    const { estado } = montagem;
    const cpu = montagem.processador();
    const gpu = montagem.placaDeVideo();
    const fonte = montagem.fonte();

    if (!montagem.gabinete() || !estado.placaNoGabinete) {
      return falha('sem_gabinete', 'Não dá para testar: a placa-mãe precisa estar dentro do gabinete.', 'Monte a placa-mãe no gabinete antes de ligar.');
    }
    if (!fonte || !estado.cabos.placa) {
      return falha('sem_energia', 'Você aperta o botão... e nada acontece.', 'A placa-mãe não recebeu energia: faltou a fonte ou o cabo de 24 pinos.');
    }
    ok('Energia chegando na placa-mãe');

    if (estado.placaDanificada) {
      return falha('pinos_tortos', 'O PC liga e desliga na mesma hora.', 'Os pinos do socket estão tortos: a placa-mãe foi danificada.');
    }
    if (!cpu) {
      return falha('sem_cpu', 'As ventoinhas giram, mas nada aparece.', 'Não há processador: ninguém executa as instruções.');
    }
    if (!estado.cabos.cpu) {
      return falha('sem_cabo_cpu', 'As ventoinhas giram, mas o monitor fica preto.', 'Faltou o cabo de energia do processador (8 pinos, perto do socket).');
    }
    ok('Processador ligado');

    if (montagem.memorias().length === 0) {
      return falha('sem_ram', 'Bip... bip... bip... (bipes longos)', 'Sem memória RAM o computador não consegue iniciar.');
    }
    ok(`Memória detectada: ${montagem.ramTotalGb()} GB`);

    const temVideo = gpu ? gpu.cabosEnergia === 0 || estado.cabos.gpu : cpu.videoIntegrado;
    if (!temVideo) {
      if (gpu) return falha('gpu_sem_cabo', 'Monitor sem sinal.', 'A placa de vídeo precisa do cabo de energia da fonte e ele não foi ligado.');
      return falha('sem_video', 'Monitor sem sinal.', 'Este processador não tem vídeo integrado e não há placa de vídeo: nada gera a imagem.');
    }
    ok(gpu ? 'Imagem pela placa de vídeo' : 'Imagem pelo vídeo integrado do processador');

    if (montagem.armazenamentos().length === 0) {
      return falha('sem_armazenamento', '"No boot device found"', 'Não há SSD nem HD: não tem onde instalar o sistema.');
    }
    if (montagem.armazenamentos().some((p) => p.interface === 'sata') && !estado.cabos.sata) {
      aviso('Um disco SATA ficou sem cabo e não apareceu no sistema');
    } else {
      ok(`Armazenamento detectado: ${montagem.armazenamentoTotalGb()} GB`);
    }

    // Teste de estresse
    const consumo = SimuladorTeste.consumoPico(montagem);
    if (fonte.potencia < consumo) {
      return {
        ...falha('fonte_fraca', `Teste de estresse: o PC desligou sozinho! (pico de ${consumo} W)`, `A fonte de ${fonte.potencia} W não aguentou o pico de consumo de ${consumo} W.`),
        consumoPico: consumo,
      };
    }
    if (fonte.potencia < consumo * 1.15) aviso(`Fonte no limite: pico de ${consumo} W numa fonte de ${fonte.potencia} W`);
    else ok(`Fonte aguentou o pico de ${consumo} W`);

    const temperatura = SimuladorTeste.temperatura(montagem);
    if (!montagem.cooler()) {
      return { ...falha('sem_cooler', `Temperatura disparou para ${temperatura} °C e o PC desligou!`, 'Sem cooler o processador superaquece em segundos.'), temperatura };
    }
    if (temperatura >= LIMITE_DESLIGA) {
      const explicacao = estado.pasta === 'nenhuma'
        ? 'Faltou pasta térmica: o calor não passa direito do processador para o cooler.'
        : `O cooler (${montagem.cooler().capacidade} W) é fraco para este processador (${cpu.tdp} W).`;
      return { ...falha('superaquecimento', `Superaquecimento: ${temperatura} °C! O PC desligou para se proteger.`, explicacao), temperatura };
    }
    if (temperatura >= LIMITE_QUENTE) aviso(`Processador muito quente (${temperatura} °C): vai perder desempenho`);
    else ok(`Temperatura sob controle: ${temperatura} °C`);

    return { sucesso: true, motivo: null, explicacao: '', etapas, temperatura, consumoPico: consumo };
  }
}
