import { useCallback, useEffect, useRef, useState } from 'react';

import { api, mensagemErro } from '@/infrastructure';
import type { DiaryEntry, Mood } from '@/models';

import { useSemLogin } from './useSemLogin';

export interface DiarioForm {
  aberto: boolean;
  editandoId: number | null;
  titulo: string;
  texto: string;
  emocao: Mood | null;
}

const FORM_VAZIO: DiarioForm = { aberto: false, editandoId: null, titulo: '', texto: '', emocao: null };

export function useDiarioController() {
  const tratarSemLogin = useSemLogin();
  const [entradas, setEntradas] = useState<DiaryEntry[]>([]);
  const [busca, setBuscaState] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<DiaryEntry | null>(null);
  const [form, setForm] = useState<DiarioForm>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<DiaryEntry | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const reqId = useRef(0);

  const carregar = useCallback(
    async (q: string) => {
      const meu = ++reqId.current;
      setCarregando(true);
      setErro(null);
      try {
        const lista = (await api.diario.listar(q.trim() || undefined)) ?? [];
        if (meu !== reqId.current) return;
        setEntradas([...lista].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      } catch (e) {
        if (meu !== reqId.current || tratarSemLogin(e)) return;
        setErro(mensagemErro(e));
      } finally {
        if (meu === reqId.current) setCarregando(false);
      }
    },
    [tratarSemLogin],
  );

  // busca no back (GET /v1/diary?q=) com debounce de 400ms
  useEffect(() => {
    const t = setTimeout(() => carregar(busca), busca ? 400 : 0);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  const setBusca = useCallback((v: string) => setBuscaState(v), []);

  const novaEntrada = useCallback(() => {
    setErroForm(null);
    setForm({ ...FORM_VAZIO, aberto: true });
  }, []);

  const editar = useCallback((e: DiaryEntry) => {
    setErroForm(null);
    setForm({ aberto: true, editandoId: e.id, titulo: e.title, texto: e.text, emocao: e.emotion });
  }, []);

  const fecharForm = useCallback(() => {
    setForm(FORM_VAZIO);
    setErroForm(null);
  }, []);

  const mudarForm = useCallback((parcial: Partial<DiarioForm>) => setForm((f) => ({ ...f, ...parcial })), []);

  /** Clicar de novo na mesma emoção tira a seleção (emoção é opcional). */
  const alternarEmocao = useCallback(
    (m: Mood) => setForm((f) => ({ ...f, emocao: f.emocao === m ? null : m })),
    [],
  );

  /** Salva o formulário. Devolve a anotação salva (ou null se não salvou), para a tela animar a página. */
  const salvar = useCallback(async (): Promise<DiaryEntry | null> => {
    if (salvando) return null;
    const title = form.titulo.trim();
    const text = form.texto.trim();
    if (!title || !text) {
      setErroForm('Por favor, preencha o título e o texto.');
      return null;
    }
    setSalvando(true);
    setErroForm(null);
    let salva: DiaryEntry | null = null;
    try {
      const dados = { title, text, emotion: form.emocao };
      salva = form.editandoId ? await api.diario.atualizar(form.editandoId, dados) : await api.diario.criar(dados);
    } catch (e) {
      if (!tratarSemLogin(e)) setErroForm(mensagemErro(e, 'Erro ao salvar. Tente novamente.'));
      setSalvando(false);
      return null;
    }
    setSalvando(false);
    setForm(FORM_VAZIO);
    setVisualizando(null);
    if (busca) setBuscaState('');
    else carregar('');
    return salva ?? { id: form.editandoId ?? -1, title, text, emotion: form.emocao, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }, [salvando, form, busca, carregar, tratarSemLogin]);

  const pedirExclusao = useCallback((e: DiaryEntry) => setParaExcluir(e), []);
  const cancelarExclusao = useCallback(() => setParaExcluir(null), []);

  /** Apaga no back e recarrega. 404 conta como apagada. Devolve true se saiu do diário. */
  const apagar = useCallback(
    async (alvo: DiaryEntry): Promise<boolean> => {
      setExcluindo(true);
      try {
        await api.diario.apagar(alvo.id);
      } catch (e) {
        if (tratarSemLogin(e)) return false;
        if ((e as { status?: number }).status !== 404) {
          setErro(mensagemErro(e, 'Erro ao excluir. Tente novamente.'));
          setExcluindo(false);
          return false;
        }
      }
      setExcluindo(false);
      carregar(busca);
      return true;
    },
    [busca, carregar, tratarSemLogin],
  );

  const confirmarExclusao = useCallback(async () => {
    if (!paraExcluir) return false;
    const ok = await apagar(paraExcluir);
    setParaExcluir(null);
    if (ok) setVisualizando(null);
    return ok;
  }, [paraExcluir, apagar]);

  return {
    entradas, busca, setBusca, carregando, erro, recarregar: () => carregar(busca),
    visualizando, ver: setVisualizando, fecharVisualizacao: () => setVisualizando(null),
    form, mudarForm, alternarEmocao, novaEntrada, editar, fecharForm, salvar, salvando, erroForm,
    paraExcluir, pedirExclusao, cancelarExclusao, confirmarExclusao, excluindo, apagar,
  };
}
