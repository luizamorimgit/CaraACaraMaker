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


    // ==========================================
    // ABRIR CHAT
    // ==========================================

    function openChat() {

        if (!chatPanel) return;

        chatPanel.hidden = false;

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

    function addChatMessage(text, ownMessage) {

        if (!chatMessages) return;

        if (!text) return;


        const messageElement = document.createElement("div");

        messageElement.className =
            ownMessage
                ? "chat-message own"
                : "chat-message opponent";


        messageElement.textContent = text;


        chatMessages.appendChild(
            messageElement
        );


        // ======================================
        // MANTER APENAS AS 2 ÚLTIMAS
        // ======================================

        while (
            chatMessages.children.length > 2
        ) {

            chatMessages.removeChild(
                chatMessages.firstElementChild
            );
        }


        // ======================================
        // ROLAR PARA BAIXO
        // ======================================

        chatMessages.scrollTop =
            chatMessages.scrollHeight;
    }


    // ==========================================
    // LIMPAR CHAT
    // ==========================================

    function clearChat() {

        if (!chatMessages) return;

        chatMessages.innerHTML = "";
    }


    // ==========================================
    // ENVIAR MENSAGEM
    // ==========================================

    function sendChatMessage() {

        if (!chatInput) return;


        const text =
            chatInput.value.trim();


        if (!text) return;


        // ======================================
        // VERIFICAR WEBSOCKET
        // ======================================

        if (
            typeof socket === "undefined"
            || socket === null
            || socket.readyState !== WebSocket.OPEN
        ) {

            return;
        }


        // ======================================
        // ENVIAR PELO MESMO WEBSOCKET DO JOGO
        // ======================================

        try {

            if (
                typeof sendGameMessage === "function"
            ) {

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


            // ==================================
            // MOSTRAR PRÓPRIA MENSAGEM
            // ==================================

            addChatMessage(
                text,
                true
            );


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
            data.message
            || data.text;


        if (!text) return;


        // ======================================
        // MENSAGEM RECEBIDA É DO ADVERSÁRIO
        // ======================================

        addChatMessage(
            text,
            false
        );
    }


    // ==========================================
    // BOTÃO ABRIR
    // ==========================================

    if (chatToggle) {

        chatToggle.addEventListener(
            "click",
            function () {

                if (
                    chatPanel
                    && chatPanel.hidden
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
    // FORMULÁRIO DO CHAT
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


    // ==========================================
    // FUNÇÕES DISPONÍVEIS GLOBALMENTE
    // ==========================================

    window.handleChatMessage =
        handleChatMessage;

    window.clearChat =
        clearChat;

    window.openChat =
        openChat;

    window.closeChat =
        closeChat;

})();