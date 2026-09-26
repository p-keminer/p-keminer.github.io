// Old semester bookmarks now show the same current cumulative transcript.
// The document, previews and download links also work without JavaScript.
const url = new URL(window.location.href);
if (url.searchParams.has('semester')) {
  url.searchParams.delete('semester');
  window.history.replaceState(window.history.state, '', url);
}
