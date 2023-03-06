export function utoa(data: string): string {
  if (!data) {
    return "";
  }
  return btoa(unescape(encodeURIComponent(data)));
}

export function atou(base64: string): string {
  if (!base64) {
    return "";
  }
  return decodeURIComponent(escape(atob(base64)));
}
