// ==========================================
// CHAT
// ==========================================

(function () {

    const chatToggle = document.getElementById("chatToggle");
    const chatPanel = document.getElementById("chatPanel");
    const chatClose = document.getElementById("chatClose");
    const chatMessages = document.getElementById("chatMessages");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");

    let unreadCount = 0;
    let notificationDot = null;

    // ==========================================
    // NOTIFICAÇÃO DE NOVA MENSAGEM
    // ==========================================

    function createNotificationDot() {

        if (!chatToggle || notificationDot) {
            return;
        }

        notificationDot = document.createElement("span");
        notificationDot.className = "chat-notification";
        notificationDot.setAttribute("aria-label", "Nova mensagem");
        notificationDot.hidden = true;

        chatToggle.appendChild(notificationDot);
    }


    function showNotification() {

        createNotificationDot();

        unreadCount += 1;

        if (notificationDot) {
            notificationDot.hidden = false;
        }
    }


    function clearNotification() {

        unreadCount = 0;

        if (notificationDot) {
            notificationDot.hidden = true;
        }
    }


    // ==========================================
    // ABRIR CHAT
    // ==========================================

    function openChat() {

        if (!chatPanel) return;

        chatPanel.hidden = false;
        clearNotification();

        if (chatInput) {
            chatInput.focus();
        }
    }


    // ==========================================
    // FECHAR CHAT
    // ==========================================

    function closeChat() {

        if (!chatPanel) return;

        chatPanel.hidden = true;
    }


    // ==========================================
    // ADICIONAR MENSAGEM
    // ==========================================

    function addChatMessage(text, sender) {

        if (!chatMessages || !text) return;

        const messageElement = document.createElement("div");

        const senderNumber = Number(sender);

        messageElement.className =
            senderNumber === 1
                ? "chat-message player1"
                : "chat-message player2";

        messageElement.textContent = text;

        chatMessages.appendChild(messageElement);

        while (chatMessages.children.length > 2) {
            chatMessages.removeChild(
                chatMessages.firstElementChild
            );
        }

        chatMessages.scrollTop =
            chatMessages.scrollHeight;
    }


    // ==========================================
    // LIMPAR CHAT
    // ==========================================

    function clearChat() {

        if (!chatMessages) return;

        chatMessages.innerHTML = "";
        clearNotification();
    }


    // ==========================================
    // ENVIAR MENSAGEM
    // ==========================================

    function sendChatMessage() {

        if (!chatInput) return;

        const text = chatInput.value.trim();

        if (!text) return;

        if (
            typeof socket === "undefined" ||
            socket === null ||
            socket.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        try {

            if (typeof sendGameMessage === "function") {

                sendGameMessage({
                    type: "chat_message",
                    message: text
                });

            } else {

                socket.send(
                    JSON.stringify({
                        type: "chat_message",
                        message: text
                    })
                );
            }

            // A mensagem própria aparece quando o servidor devolve
            // o evento, evitando duplicação.
            chatInput.value = "";

        } catch (error) {

            console.error(
                "Erro ao enviar mensagem do chat:",
                error
            );
        }
    }


    // ==========================================
    // RECEBER MENSAGEM
    // ==========================================

    function handleChatMessage(data) {

        if (!data) return;

        const text =
            data.message ||
            data.text;

        if (!text) return;

        const sender = Number(data.sender);
        const localPlayer = Number(
            typeof playerNumber !== "undefined"
                ? playerNumber
                : 0
        );

        if (sender !== 1 && sender !== 2) {
            return;
        }

        addChatMessage(text, sender);

        // Notifica somente mensagens do outro jogador.
        if (sender !== localPlayer) {

            if (
                !chatPanel ||
                chatPanel.hidden
            ) {
                showNotification();
            }
        }
    }


    // ==========================================
    // BOTÃO ABRIR
    // ==========================================

    if (chatToggle) {

        createNotificationDot();

        chatToggle.addEventListener(
            "click",
            function () {

                if (
                    chatPanel &&
                    chatPanel.hidden
                ) {

                    openChat();

                } else {

                    closeChat();
                }
            }
        );
    }


    // ==========================================
    // BOTÃO FECHAR
    // ==========================================

    if (chatClose) {

        chatClose.addEventListener(
            "click",
            function () {
                closeChat();
            }
        );
    }


    // ==========================================
    // FORMULÁRIO
    // ==========================================

    if (chatForm) {

        chatForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();
                sendChatMessage();
            }
        );
    }


    window.handleChatMessage =
        handleChatMessage;

    window.clearChat =
        clearChat;

    window.openChat =
        openChat;

    window.closeChat =
        closeChat;

})();
