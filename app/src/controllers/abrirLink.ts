import { Linking, Platform } from 'react-native';

/** Abre link externo ou telefone. Na web, tel: usa a própria janela (nova aba em branco não disca). */
export function abrirLink(url: string): void {
  if (Platform.OS === 'web') {
    if (url.startsWith('tel:') || url.startsWith('mailto:')) window.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => {});
}
