import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Liga o menu flutuante às telas: `espacoInferior` é o quanto a tela precisa reservar embaixo
 * para o conteúdo não ficar atrás da bolinha do menu (0 quando ela está na lateral).
 */
interface NavChrome {
  espacoInferior: number;
  setEspacoInferior: (px: number) => void;
  /** esconde a bolinha do menu (ex.: durante a abertura da Home) */
  menuOculto: boolean;
  setMenuOculto: (v: boolean) => void;
  /**
   * Telefone: a bolinha afunda para fora da tela e sobra só uma alça com seta, que abre a roda
   * direto (ex.: sessão aberta, para o campo de mensagem ganhar espaço). Sem efeito na lateral.
   */
  menuRecolhido: boolean;
  setMenuRecolhido: (v: boolean) => void;
}

const Ctx = createContext<NavChrome>({
  espacoInferior: 0,
  setEspacoInferior: () => {},
  menuOculto: false,
  setMenuOculto: () => {},
  menuRecolhido: false,
  setMenuRecolhido: () => {},
});

export function NavChromeProvider({ children }: { children: React.ReactNode }) {
  const [espacoInferior, setEspacoInferior] = useState(0);
  const [menuOculto, setMenuOculto] = useState(false);
  const [menuRecolhido, setMenuRecolhido] = useState(false);
  const valor = useMemo(
    () => ({ espacoInferior, setEspacoInferior, menuOculto, setMenuOculto, menuRecolhido, setMenuRecolhido }),
    [espacoInferior, menuOculto, menuRecolhido],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useNavChrome = () => useContext(Ctx);
