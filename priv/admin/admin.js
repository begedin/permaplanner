const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const liveSocket = new window.LiveView.LiveSocket('/live', window.Phoenix.Socket, {
  params: { _csrf_token: csrfToken },
});
liveSocket.connect();
