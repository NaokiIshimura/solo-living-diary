// solo-living-diary.pages.dev（本番の pages.dev の URL）で開かれたら、正規の https://solo-living-diary.nacn.app/ へ 301 で転送する（nostalgia-diary と同じ）。
// プレビュー（<hash>.solo-living-diary.pages.dev やブランチの別名）はホスト名の区切りが4つ以上あるので転送しない（確認できるようにするため）
const CANONICAL_HOST = 'solo-living-diary.nacn.app';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev') && url.hostname.split('.').length === 3) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
