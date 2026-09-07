// ==========================================
// CONFIGURAÇÃO DO SERVIDOR
// ==========================================

const SERVER_URL =
    "wss://cara-a-cara-marker-server.onrender.com/ws/";

let socket = null;
let connectionTimeout = null;

let roomCode = "";
let playerNumber = null;

let socketGeneration = 0;

let retryTimer = null;


// ==========================================
// ELEMENTOS
// ==========================================

const screens =
    document.querySelectorAll(".screen");

const lobby =
    document.getElementById("lobby");

const joinRoomScreen =
    document.getElementById("joinRoom");

const waitingRoom =
    document.getElementById("waitingRoom");

const setup =
    document.getElementById("setup");

const joinRoomCode =
    document.getElementById("joinRoomCode");

const waitingCode =
    document.getElementById("waitingCode");

const playersList =
    document.getElementById("playersList");

const waitingMessage =
    document.getElementById("waitingMessage");

const playerTitle =
    document.getElementById("playerTitle");

const imageGrid =
    document.getElementById("imageGrid");

const gamePopup =
    document.getElementById("gamePopup");

const popupBoard =
    document.getElementById("popupBoard");


// ==========================================
// TROCAR DE TELA
// ==========================================

function showScreen(screen) {

    if (!screen) {
        return;
    }

    screens.forEach(function (item) {
        item.classList.remove("active");
    });

    screen.classList.add("active");
}

// ==========================================
// INSTALAÇÃO DO APP
// ==========================================

let deferredPrompt = null;

const installButton = document.getElementById("installButton");

function hideInstallButtonIfInstalled() {
    const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (isInstalled && installButton) {
        installButton.hidden = true;
    }
}

hideInstallButtonIfInstalled();

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
});

installButton?.addEventListener("click", async () => {

    if (!deferredPrompt) {

        openPopup(
            "INSTALAÇÃO INDISPONÍVEL",
            "A INSTALAÇÃO DO APP NÃO ESTÁ DISPONÍVEL NESTE DISPOSITIVO OU NAVEGADOR.",
            null,
            "OK"
        );

        return;
    }

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
    deferredPrompt = null;

    if (installButton) {
        installButton.hidden = true;
    }
});

// ==========================================
// RESETAR BOTÕES
// ==========================================

function resetRoomButtons() {

    const createButton =
        document.querySelector(
            '#lobby button[onclick="createRoom()"]'
        );

    if (createButton) {

        createButton.textContent =
            "CRIAR SALA";

        createButton.disabled =
            false;
    }


    const joinRoomButton =
        document.querySelector(
            '#lobby button[onclick="showJoinRoom()"]'
        );

    if (joinRoomButton) {

        joinRoomButton.textContent =
            "ENTRAR EM SALA";

        joinRoomButton.disabled =
            false;
    }


    const joinButton =
        document.getElementById(
            "joinButton"
        );

    if (joinButton) {

        joinButton.textContent =
            "ENTRAR";

        joinButton.disabled =
            false;
    }
}

// ==========================================
// TEMA DO JOGADOR
// ==========================================

function applyPlayerTheme() {

    document.body.classList.remove(
        "player-1-theme",
        "player-2-theme"
    );

    if (playerNumber === 1) {

        document.body.classList.add(
            "player-1-theme"
        );

    } else if (playerNumber === 2) {

        document.body.classList.add(
            "player-2-theme"
        );
    }
}

const themeToggle =
    document.getElementById("themeToggle");

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "dark"
            );

             if (document.body.classList.contains("dark")) {

                themeToggle.textContent = "☾";

            } else {

                themeToggle.textContent = "☀";

            }

        }
    );

}

// ==========================================
// VOLTAR PARA O LOBBY
// ==========================================

function backToRoomChoice() {

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        leaveRoom();

    } else {

        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout = null;
        }

        if (retryTimer) {

            clearTimeout(
                retryTimer
            );

            retryTimer = null;
        }

        roomCode = "";
        playerNumber = null;

        resetRoomButtons();

        showScreen(lobby);
    }
}

// ==========================================
// GERAR CÓDIGO DA SALA
// ==========================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 4; i++) {

        code +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );
    }

    return code;
}


// ==========================================
// CRIAR SALA
// ==========================================

function createRoom() {

    const button =
        document.querySelector(
            '#lobby button[onclick="createRoom()"]'
        );


    // ======================================
    // GARANTIR ESTADO LIMPO
    // ======================================

    if (connectionTimeout) {

        clearTimeout(
            connectionTimeout
        );

        connectionTimeout =
            null;
    }


    // Se ainda existir um socket antigo,
    // fecha antes de criar outro.

    if (socket) {

        try {
            socket.close();
        } catch (error) {}

        socket =
            null;
    }


    // ======================================
    // BLOQUEAR BOTÃO
    // ======================================

    if (button) {

        button.textContent =
            "CRIANDO...";

        button.disabled =
            true;
    }


    // ======================================
    // GERAR NOVA SALA
    // ======================================

    const code =
        generateRoomCode();


    roomCode =
        code;


    // ======================================
    // CRIAR CONEXÃO
    // ======================================

    connectToRoom(
        code,
        "create"
    );
}

// ==========================================
// MOSTRAR TELA DE ENTRAR
// ==========================================

function showJoinRoom() {

    resetRoomButtons();

    joinRoomCode.value =
        "";

    showScreen(
        joinRoomScreen
    );

    setTimeout(
        function () {

            joinRoomCode.focus();

        },
        50
    );
}


// ==========================================
// INPUT DO CÓDIGO
// ==========================================

joinRoomCode.addEventListener(
    "input",
    function () {

        this.value =
            this.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 4);
    }
);


// ==========================================
// ENTRAR NA SALA
// ==========================================

function showJoinRoom() {

    resetRoomButtons();

    joinRoomCode.value =
        "";

    showScreen(
        joinRoomScreen
    );

    setTimeout(
        function () {

            joinRoomCode.focus();

        },
        50
    );
}


// ==========================================
// INPUT DO CÓDIGO
// ==========================================

joinRoomCode.addEventListener(
    "input",
    function () {

        this.value =
            this.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 4);
    }
);


// ==========================================
// ENTRAR NA SALA
// ==========================================

function joinRoom() {

    const code =
        joinRoomCode.value
            .trim()
            .toUpperCase();


    if (code.length !== 4) {

        openPopup(
            "CÓDIGO INVÁLIDO",
            "POR FAVOR, DIGITE UM CÓDIGO DE 4 CARACTERES.",
            null,
            "OK"
        );

        return;
    }


    const button =
        document.getElementById(
            "joinButton"
        );


    if (button) {

        button.textContent =
            "ENTRANDO...";

        button.disabled =
            true;
    }


    roomCode =
        code;


    connectToRoom(
        code,
        "join"
    );
}


// ==========================================
// CONECTAR AO SERVIDOR
// ==========================================

function connectToRoom(
    code,
    action
) {

    if (connectionTimeout) {

        clearTimeout(
            connectionTimeout
        );

        connectionTimeout = null;
    }


    // ======================================
    // INVALIDAR CONEXÃO ANTERIOR
    // ======================================

    socketGeneration++;

    const currentGeneration =
        socketGeneration;


    if (socket) {

        try {
            socket.close();
        } catch (error) {}

        socket = null;
    }


    const url =
        SERVER_URL +
        encodeURIComponent(code) +
        "/" +
        action;


    console.log(
        "Tentando conectar:",
        url
    );


    const newSocket =
        new WebSocket(url);


    socket =
        newSocket;


    // ======================================
    // LIMITE DE 5 SEGUNDOS
    // Se o Render estiver acordando,
    // tenta conectar novamente.
    // ======================================

connectionTimeout =
    setTimeout(
        function () {

            if (
                socket === newSocket &&
                socketGeneration === currentGeneration &&
                newSocket.readyState === WebSocket.CONNECTING
            ) {

                console.log(
                    "Servidor demorou. Tentando novamente..."
                );

                try {
                    newSocket.close();
                } catch (error) {}

                socket = null;

                retryTimer =
                    setTimeout(
                        function () {

                            retryTimer = null;

                            connectToRoom(
                                code,
                                action
                            );

                        },
                        1500
                    );
            }

            connectionTimeout =
                null;

        },
        5000
    );


    // ======================================
    // CONECTADO
    // ======================================

    newSocket.onopen =
        function () {

            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            console.log(
                "WebSocket conectado!"
            );

            console.log(
                "Sala:",
                code
            );

            console.log(
                "Ação:",
                action
            );


            if (connectionTimeout) {

                clearTimeout(
                    connectionTimeout
                );

                connectionTimeout =
                    null;
            }
        };


    // ======================================
    // MENSAGEM
    // ======================================

    newSocket.onmessage =
        function (event) {

            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            console.log(
                "Mensagem do servidor:",
                event.data
            );


            let data;


            try {

                data =
                    JSON.parse(
                        event.data
                    );

            } catch (error) {

                console.error(
                    "Mensagem inválida:",
                    event.data
                );

                return;
            }


            handleServerMessage(
                data
            );
        };


    // ======================================
    // ERRO
    // ======================================

    newSocket.onerror =
        function (error) {

            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            console.error(
                "ERRO NO WEBSOCKET:",
                error
            );
        };


    // ======================================
    // FECHADO
    // ======================================

    newSocket.onclose =
        function (event) {

            console.log(
                "WebSocket fechado."
            );

            console.log(
                "Código:",
                event.code
            );

            console.log(
                "Motivo:",
                event.reason
            );


            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            socket =
                null;


            if (connectionTimeout) {

                clearTimeout(
                    connectionTimeout
                );

                connectionTimeout =
                    null;
            }
        };
}

// ==========================================
// MENSAGENS DO SERVIDOR
// ==========================================

function handleServerMessage(data) {

    if (!data || !data.type) {
        return;
    }


    // ======================================
    // ENTROU NA SALA
    // ======================================

    if (data.type === "joined") {

        playerNumber =
            data.player;

        applyPlayerTheme();


        playerTitle.textContent =
            "JOGADOR " +
            playerNumber;


        waitingCode.textContent =
            roomCode;


        waitingMessage.textContent =
            "AGUARDANDO OUTRO JOGADOR...";


        showScreen(
            waitingRoom
        );


        return;
    }


    // ======================================
    // ATUALIZAÇÃO DOS JOGADORES
    // ======================================

    if (data.type === "players") {

        updatePlayersList(
            Array.isArray(data.players)
                ? data.players
                : []
        );


        const players =
            Array.isArray(data.players)
                ? data.players
                : [];


        if (players.length === 1) {

            waitingMessage.textContent =
                "AGUARDANDO OUTRO JOGADOR...";
        }


        if (players.length === 2) {

            waitingMessage.textContent =
                "OS DOIS JOGADORES ESTÃO NA SALA!";


            if (
                waitingRoom.classList.contains("active")
            ) {

                openSetup();
            }
        }


        return;
    }


    // ======================================
    // JOGADOR SAIU
    // ======================================

    if (data.type === "player_left") {

        const leavingPlayer =
            data.player || "?";


        const remainingPlayers =
            Array.isArray(data.players)
                ? data.players
                : [];


        updatePlayersList(
            remainingPlayers
        );


        waitingMessage.textContent =
            "AGUARDANDO OUTRO JOGADOR...";


        if (
            setup.classList.contains("active") ||
            (
                typeof characterChoiceScreen !== "undefined" &&
                characterChoiceScreen &&
                characterChoiceScreen.classList.contains("active")
            ) ||
            (
                typeof gameScreen !== "undefined" &&
                gameScreen &&
                gameScreen.classList.contains("active")
            )
        ) {

            if (
                typeof resetAllGameVariables === "function"
            ) {

                resetAllGameVariables();
            }


            showScreen(
                waitingRoom
            );
        }


        openPopup(
            "JOGADOR SAIU",
            "JOGADOR " +
            leavingPlayer +
            " SAIU DA SALA.",
            null,
            "OK"
        );


        return;
    }


    // ======================================
    // SALA NÃO EXISTE
    // ======================================

    if (data.type === "room_not_found") {

        if (socket) {

            try {

                socket.close();

            } catch (error) {}

            socket = null;
        }

        resetRoomButtons();


        openPopup(
            "SALA NÃO EXISTE",
            "NÃO FOI ENCONTRADA NENHUMA SALA COM ESSE CÓDIGO.",
            function () {

                showScreen(
                    joinRoomScreen
                );


                setTimeout(
                    function () {

                        joinRoomCode.focus();

                    },
                    50
                );
            },
            "OK"
        );


        return;
    }


    // ======================================
    // SALA JÁ EXISTE
    // ======================================

    if (data.type === "room_exists") {

        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket = null;
        }


        roomCode =
            generateRoomCode();


        connectToRoom(
            roomCode,
            "create"
        );


        return;
    }


    // ======================================
    // SALA CHEIA
    // ======================================

    if (data.type === "room_full") {

        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket = null;
        }


        resetRoomButtons();


        openPopup(
            "SALA CHEIA",
            "ESSA SALA JÁ TEM 2 JOGADORES.",
            function () {

                showScreen(
                    joinRoomScreen
                );

                joinRoomCode.focus();

            },
            "OK"
        );


        return;
    }


    // ======================================
    // AÇÃO INVÁLIDA
    // ======================================

    if (data.type === "invalid_action") {

        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket = null;
        }


        resetRoomButtons();


        openPopup(
            "ERRO",
            "NÃO FOI POSSÍVEL REALIZAR ESSA AÇÃO.",
            function () {

                showScreen(
                    lobby
                );
            },
            "OK"
        );


        return;
    }


    // ======================================
    // MENSAGENS DO JOGO
    // ======================================

    if (
        typeof handleGameMessage ===
        "function"
    ) {

        handleGameMessage(
            data
        );
    }
}


// ==========================================
// LISTA DE JOGADORES
// ==========================================

function updatePlayersList(players) {

    if (!playersList) {
        return;
    }


    playersList.innerHTML =
        "";


    if (!Array.isArray(players)) {
        return;
    }


    players
        .sort(function (a, b) {
            return a - b;
        })
        .forEach(
            function (number) {

                const player =
                    document.createElement(
                        "div"
                    );


                player.className =
                    "player-card";


                const color =
                    document.createElement(
                        "div"
                    );


                color.className =
                    "player-color " +
                    (
                        number === 1
                            ? "blue"
                            : "red"
                    );


                const name =
                    document.createElement(
                        "span"
                    );


                name.textContent =
                    "JOGADOR " +
                    number;


                const status =
                    document.createElement(
                        "span"
                    );


                status.className =
                    "status";


                status.textContent =
                    "CONECTADO";


                player.appendChild(
                    color
                );


                player.appendChild(
                    name
                );


                player.appendChild(
                    status
                );


                playersList.appendChild(
                    player
                );
            }
        );
}


// ==========================================
// SAIR DA SALA
// ==========================================

function leaveRoom() {

    if (connectionTimeout) {

        clearTimeout(
            connectionTimeout
        );

        connectionTimeout =
            null;
    }


    // ======================================
    // INVALIDAR CONEXÃO ATUAL
    // ======================================

    socketGeneration++;


    const oldSocket =
        socket;


    socket =
        null;


    // ======================================
    // AVISAR O SERVIDOR E FECHAR SOCKET
    // ======================================

    if (oldSocket) {

        // Se já estiver conectado,
        // avisa o servidor antes de sair.

        if (
            oldSocket.readyState ===
            WebSocket.OPEN
        ) {

            try {

                oldSocket.send(
                    JSON.stringify({
                        type: "leave_room"
                    })
                );

            } catch (error) {

                console.error(
                    "Erro ao enviar saída:",
                    error
                );
            }
        }


        // Fecha o socket independentemente
        // do estado em que ele estiver.

        try {

            oldSocket.close(
                1000,
                "Saída solicitada pelo jogador"
            );

        } catch (error) {}
    }


    // ======================================
    // LIMPAR ESTADO LOCAL DA SALA
    // ======================================

    roomCode =
        "";

    playerNumber =
        null;


    document.body.classList.remove(
        "player-1-theme",
        "player-2-theme"
    );


    updatePlayersList(
        []
    );


    waitingMessage.textContent =
        "AGUARDANDO OUTRO JOGADOR...";


    // ======================================
    // RESETAR TABULEIRO DE CONFIGURAÇÃO
    // ======================================

    boardImages = [
        null,
        null,
        null,
        null,
        null,
        null
    ];


    createImageSlots();


    // ======================================
    // RESETAR ESTADO DA PARTIDA
    // ======================================

    if (
        typeof resetAllGameVariables ===
        "function"
    ) {

        resetAllGameVariables();
    }


    // ======================================
    // RESETAR BOTÕES
    // ======================================

    resetRoomButtons();


    // ======================================
    // VOLTAR AO LOBBY
    // ======================================

    showScreen(
        lobby
    );
}

// ==========================================
// ABRIR CONFIGURAÇÃO
// ==========================================

function openSetup() {

    playerTitle.textContent =
        "JOGADOR " +
        playerNumber;


    createImageSlots();


    showScreen(
        setup
    );
}


// ==========================================
// IMAGENS DO TABULEIRO
// ==========================================

let boardImages = [
    null,
    null,
    null,
    null,
    null,
    null
];


// ==========================================
// COMPRIMIR IMAGEM
// ==========================================
//
// Aceita imagens grandes e transforma em uma
// versão menor antes de guardar em boardImages.
//
// Limite:
// maior lado = 800 px
// qualidade JPEG = 75%
// ==========================================

function compressImage(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    const img =
                        new Image();


                    img.onload =
                        function () {

                            const maxSize =
                                800;


                            let width =
                                img.width;

                            let height =
                                img.height;


                            // ==================================
                            // REDIMENSIONAR
                            // ==================================

                            if (
                                width > maxSize ||
                                height > maxSize
                            ) {

                                if (
                                    width > height
                                ) {

                                    height =
                                        Math.round(
                                            height *
                                            maxSize /
                                            width
                                        );

                                    width =
                                        maxSize;

                                } else {

                                    width =
                                        Math.round(
                                            width *
                                            maxSize /
                                            height
                                        );

                                    height =
                                        maxSize;
                                }
                            }


                            // ==================================
                            // CANVAS
                            // ==================================

                            const canvas =
                                document.createElement(
                                    "canvas"
                                );


                            canvas.width =
                                width;

                            canvas.height =
                                height;


                            const ctx =
                                canvas.getContext(
                                    "2d"
                                );


                            if (!ctx) {

                                reject(
                                    new Error(
                                        "Não foi possível criar o canvas."
                                    )
                                );

                                return;
                            }


                            // Fundo branco para imagens
                            // que possuam transparência.

                            ctx.fillStyle =
                                "#ffffff";

                            ctx.fillRect(
                                0,
                                0,
                                width,
                                height
                            );


                            ctx.drawImage(
                                img,
                                0,
                                0,
                                width,
                                height
                            );


                            // ==================================
                            // COMPRIMIR
                            // ==================================

                            const compressed =
                                canvas.toDataURL(
                                    "image/jpeg",
                                    0.75
                                );


                            console.log(
                                "Imagem comprimida:",
                                compressed.length,
                                "caracteres"
                            );


                            resolve(
                                compressed
                            );
                        };


                    img.onerror =
                        function () {

                            reject(
                                new Error(
                                    "Não foi possível carregar a imagem."
                                )
                            );
                        };


                    img.src =
                        event.target.result;
                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Não foi possível ler a imagem."
                        )
                    );
                };


            reader.readAsDataURL(
                file
            );
        }
    );
}


// ==========================================
// CRIAR OS 6 SLOTS
// ==========================================

function createImageSlots() {

    imageGrid.innerHTML =
        "";


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const slot =
            document.createElement(
                "div"
            );


        slot.className =
            "image-slot";


        slot.dataset.position =
            i;


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "file";


        input.accept =
            "image/*";

        
        input.multiple =
        true;
        
        slot.appendChild(
            input
        );


        if (boardImages[i]) {

            const img =
                document.createElement(
                    "img"
                );


            img.src =
                boardImages[i];


            slot.appendChild(
                img
            );

        } else {

            const plus =
                document.createElement(
                    "span"
                );


            plus.textContent =
                "+";


            slot.appendChild(
                plus
            );
        }


        // ==================================
        // CLICAR NO SLOT
        // ==================================

        slot.addEventListener(
            "click",
            function () {

                input.click();
            }
        );


        // ==================================
        // ESCOLHER IMAGEM
        // ==================================

        input.addEventListener(
            "change",
            function (event) {

                loadImage(
                    event,
                    i
                );
            }
        );

        // ==================================
        // DRAG
        // ==================================

        slot.draggable =
            true;


        slot.addEventListener(
            "dragstart",
            function () {

                slot.classList.add(
                    "dragging"
                );
            }
        );


        slot.addEventListener(
            "dragend",
            function () {

                slot.classList.remove(
                    "dragging"
                );
            }
        );


        slot.addEventListener(
            "dragover",
            function (event) {

                event.preventDefault();

                slot.classList.add(
                    "drag-over"
                );
            }
        );


        slot.addEventListener(
            "dragleave",
            function () {

                slot.classList.remove(
                    "drag-over"
                );
            }
        );


        slot.addEventListener(
            "drop",
            function (event) {

                event.preventDefault();


                slot.classList.remove(
                    "drag-over"
                );


                const dragging =
                    document.querySelector(
                        ".image-slot.dragging"
                    );


                if (!dragging) {
                    return;
                }


                const from =
                    Number(
                        dragging.dataset.position
                    );


                const to =
                    Number(
                        slot.dataset.position
                    );


                if (from === to) {
                    return;
                }


                const temp =
                    boardImages[from];


                boardImages[from] =
                    boardImages[to];


                boardImages[to] =
                    temp;


                createImageSlots();
            }
        );


        imageGrid.appendChild(
            slot
        );
    }
}


// ==========================================
// COMPATIBILIDADE COM O HTML
// ==========================================

function loadImage(
    eventOrFile,
    position
) {

    let files;


    // ==================================
    // ARQUIVO DIRETO
    // Usado ao colar uma imagem
    // ==================================

    if (
        eventOrFile instanceof File
    ) {

        files = [
            eventOrFile
        ];


        // Se não foi indicada uma posição,
        // usa o primeiro slot vazio.

        if (
            typeof position !== "number"
        ) {

            position =
                boardImages.findIndex(
                    function (image) {
                        return image === null;
                    }
                );


            if (position === -1) {

                openPopup(
                    "TABULEIRO CHEIO",
                    "OS 6 ESPAÇOS DO TABULEIRO JÁ ESTÃO PREENCHIDOS.",
                    null,
                    "OK"
                );

                return;
            }
        }


    // ==================================
    // INPUT DE ARQUIVO
    // ==================================

    } else {

        if (
            !eventOrFile ||
            !eventOrFile.target ||
            !eventOrFile.target.files ||
            eventOrFile.target.files.length === 0
        ) {
            return;
        }


        files =
            Array.from(
                eventOrFile.target.files
            );
    }

    // ==================================
    // UMA IMAGEM
    // ==================================

    if (files.length === 1) {

        compressImage(files[0])
            .then(
                function (compressedImage) {

                    boardImages[position] =
                        compressedImage;

                    createImageSlots();
                }
            )
            .catch(
                function (error) {

                    console.error(
                        "Erro ao comprimir imagem:",
                        error
                    );

                    openPopup(
                        "ERRO",
                        "NÃO FOI POSSÍVEL CARREGAR ESSA IMAGEM.",
                        null,
                        "OK"
                    );
                }
            );

        return;
    }


    // ==================================
    // VÁRIAS IMAGENS
    // ==================================

    let currentPosition =
        position;

    const compressionPromises =
        [];


    files.forEach(
        function (file) {

            const targetPosition =
                currentPosition;


            const promise =
                compressImage(file)
                    .then(
                        function (compressedImage) {

                            boardImages[targetPosition] =
                                compressedImage;
                        }
                    );


            compressionPromises.push(
                promise
            );


            currentPosition =
                (currentPosition + 1) % 6;
        }
    );


    Promise.all(
        compressionPromises
    )
    .then(
        function () {

            createImageSlots();
        }
    )
    .catch(
        function (error) {

            console.error(
                "Erro ao comprimir imagens:",
                error
            );

            openPopup(
                "ERRO",
                "NÃO FOI POSSÍVEL CARREGAR UMA OU MAIS IMAGENS.",
                null,
                "OK"
            );
        }
    );
}

// ==========================================
// BOTÃO "PRONTO"
// ==========================================

function finishSetup() {

    const filled =
        boardImages.filter(
            function (image) {
                return image !== null;
            }
        ).length;


    if (filled < 6) {

        openPopup(
            "TABULEIRO INCOMPLETO",
            "POR FAVOR, COLOQUE 6 IMAGENS!",
            null,
            "OK"
        );

        return;
    }


    boardConfirmed();
}

// ==========================================
// POPUP
// ==========================================

let popupCallback =
    null;


function openPopup(
    title,
    message,
    callback,
    buttonText = "OK",
    showBoard = false
) {

    if (!gamePopup) {
        return;
    }


    const popupTitle =
        gamePopup.querySelector(
            "h2"
        );


    const popupMessage =
        gamePopup.querySelector(
            "p"
        );


    const popupActions =
        gamePopup.querySelector(
            ".popup-actions"
        );


    popupTitle.textContent =
        title;


    popupMessage.textContent =
        message;


    // Limpar elementos antigos residuais
    const popupContent = gamePopup.querySelector(".game-popup");

    if (popupContent) {

        const oldInput =
            popupContent.querySelector("#restoreCodeInput");

        if (oldInput) {
            oldInput.remove();
        }


        const oldCode =
            popupContent.querySelector(".saved-game-code");

        if (oldCode) {
            oldCode.remove();
        }


        const oldBetGrid =
            popupContent.querySelector(".bet-popup-grid");

        if (oldBetGrid) {
            oldBetGrid.remove();
        }


        const oldCharacterImage =
            popupContent.querySelector(".popup-character-image");

        if (oldCharacterImage) {
            oldCharacterImage.remove();
        }
    }


        popupCallback =
            callback;


        popupBoard.style.display =
            showBoard
                ? "grid"
                : "none";


        popupActions.innerHTML =
            "";


        if (buttonText) {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "popup-button";


            button.textContent =
                buttonText;


            button.addEventListener(
                "click",
                function () {

                    const callbackToRun =
                        popupCallback;


                    closePopup();


                    if (callbackToRun) {

                        callbackToRun();
                    }
                }
            );


            popupActions.appendChild(
                button
            );
        }


        if (showBoard) {

            const modify =
                document.createElement(
                    "button"
                );


            modify.className =
                "popup-button secondary";


            modify.textContent =
                "MODIFICAR TABULEIRO";


            modify.addEventListener(
                "click",
                function () {

                    closePopup();
                }
            );


            const confirm =
                document.createElement(
                    "button"
                );


            confirm.className =
                "popup-button";


            confirm.textContent =
                "CONFIRMAR";


            confirm.addEventListener(
                "click",
                function () {

                    closePopup();

                    boardConfirmed();
                }
            );


            popupActions.appendChild(
                modify
            );


            popupActions.appendChild(
                confirm
            );
        }


        gamePopup.classList.add(
            "active"
        );
    }

// ==========================================
// FECHAR POPUP
// ==========================================

function closePopup() {

    if (!gamePopup) {
        return;
    }


    gamePopup.classList.remove(
        "active"
    );


    popupCallback =
        null;
}


// ==========================================
// TABULEIRO CONFIRMADO
// ==========================================

function boardConfirmed() {

    waitingMessage.textContent =
        "SEU TABULEIRO FOI CONFIRMADO.";


    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        const boardSize =
            JSON.stringify(
                boardImages
            ).length;


        console.log(
            "TAMANHO DO TABULEIRO:",
            boardSize,
            "caracteres"
        );


        socket.send(
            JSON.stringify({
                type: "board_ready",
                images: boardImages
            })
        );

    } else {

        openPopup(
            "ERRO",
            "O WebSocket NÃO está conectado.",
            null,
            "OK"
        );

        return;
    }


    showScreen(
        waitingRoom
    );
}


// ==========================================
// SAIR DA CONFIGURAÇÃO
// ==========================================

function leaveSetup() {

    openPopup(
        "TEM CERTEZA?",
        "SEU TABULEIRO SERÁ DESCARTADO.",
        function () {

            boardImages = [
                null,
                null,
                null,
                null,
                null,
                null
            ];

            createImageSlots();

            leaveRoom();
        },
        "SAIR"
    );


    const popupActions =
        gamePopup.querySelector(
            ".popup-actions"
        );


    const backButton =
        document.createElement(
            "button"
        );


    backButton.className =
        "popup-button secondary";


    backButton.textContent =
        "VOLTAR";


    backButton.addEventListener(
        "click",
        function () {

            closePopup();
        }
    );


    popupActions.insertBefore(
        backButton,
        popupActions.firstChild
    );
}


// ==========================================
// SALVAR E RESGATAR TABULEIRO NA CRIAÇÃO (ITEM 8)
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("createSaveBoardButton");
    if (btn) {
        btn.addEventListener("click", openSaveOrRestoreBoardPopup);
    }
});

function openSaveOrRestoreBoardPopup() {
    openPopup(
        "SALVAR OU RESGATAR TABULEIRO",
        "Deseja gerar um código para o seu tabuleiro atual ou resgatar um tabuleiro salvo por código?",
        null,
        false
    );

    const popupActions = gamePopup.querySelector(".popup-actions");
    if (popupActions) {
        popupActions.innerHTML = "";

        const restoreBtn = document.createElement("button");
        restoreBtn.className = "popup-button secondary";
        restoreBtn.textContent = "RESGATAR CÓDIGO";
        restoreBtn.onclick = function () {
            closePopup();
            handleRestoreBoardCode();
        };

        const saveBtn = document.createElement("button");
        saveBtn.className = "popup-button";
        saveBtn.textContent = "SALVAR E GERAR CÓDIGO";
        saveBtn.onclick = function () {
            closePopup();
            handleSaveBoardCode();
        };

        popupActions.appendChild(restoreBtn);
        popupActions.appendChild(saveBtn);
    }
}

function handleSaveBoardCode() {
    const hasImage = boardImages.some(function (img) { return img !== null; });
    if (!hasImage) {
        openPopup(
            "TABULEIRO VAZIO",
            "Adicione pelo menos uma imagem ao tabuleiro antes de salvar.",
            null,
            "OK"
        );
        return;
    }

    const code = "TAB" + Math.floor(1000 + Math.random() * 9000);
    try {
        localStorage.setItem("saved_board_" + code, JSON.stringify(boardImages));
    } catch (e) {
        console.error("Erro ao salvar no localStorage", e);
    }

    openPopup(
        "TABULEIRO SALVO!",
        "Código gerado para este tabuleiro:",
        null,
        "FECHAR"
    );

    const popupContent = gamePopup.querySelector(".game-popup");
    const popupActions = popupContent.querySelector(".popup-actions");

    let codeElement = popupContent.querySelector(".saved-game-code");
    if (!codeElement) {
        codeElement = document.createElement("div");
        codeElement.className = "saved-game-code";
        popupContent.insertBefore(codeElement, popupActions);
    }
    codeElement.textContent = code;

    if (popupActions) {
        const copyBtn = document.createElement("button");
        copyBtn.className = "popup-button secondary";
        copyBtn.textContent = "📋 COPIAR CÓDIGO";
        copyBtn.onclick = function () {
            navigator.clipboard.writeText(code);
            copyBtn.textContent = "✓ COPIADO!";
        };
        popupActions.insertBefore(copyBtn, popupActions.firstChild);
    }
}

function handleRestoreBoardCode() {
    openPopup(
        "RESGATAR TABULEIRO",
        "Digite o código do tabuleiro salvo abaixo:",
        null,
        "CANCELAR"
    );

    const popupContent = gamePopup.querySelector(".game-popup");
    const popupActions = popupContent.querySelector(".popup-actions");

    const input = document.createElement("input");
    input.type = "text";
    input.id = "restoreCodeInput";
    input.placeholder = "EX: TAB1234";
    input.style.cssText = "width: 80%; padding: 10px; font-size: 1.1rem; border-radius: 8px; border: 2px solid #ccc; text-align: center; text-transform: uppercase; margin: 15px auto; display: block;";

    popupContent.insertBefore(input, popupActions);

    setTimeout(function() { input.focus(); }, 100);

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "popup-button";
    confirmBtn.textContent = "CARREGAR";
    confirmBtn.onclick = function () {
        const codeVal = input.value.trim().toUpperCase();
        if (!codeVal) return;

        let saved = null;
        try {
            saved = localStorage.getItem("saved_board_" + codeVal);
        } catch (e) {}

        if (!saved) {
            openPopup(
                "CÓDIGO NÃO ENCONTRADO",
                "Nenhum tabuleiro foi encontrado com o código: " + codeVal,
                null,
                "OK"
            );
            return;
        }

        try {
            const images = JSON.parse(saved);
            if (Array.isArray(images) && images.length === 6) {
                boardImages = images;
                createImageSlots();
                openPopup(
                    "TABULEIRO CARREGADO!",
                    "O tabuleiro " + codeVal + " foi carregado com sucesso.",
                    null,
                    "OK"
                );
            }
        } catch (e) {
            openPopup(
                "ERRO AO CARREGAR",
                "Ocorreu um erro ao carregar o tabuleiro salvo.",
                null,
                "OK"
            );
        }
    };

    popupActions.appendChild(confirmBtn);
}

// ==========================================
// ADICIONAR IMAGEM PELO GOOGLE / COLAR
// ==========================================

const pasteImageButton =
    document.getElementById(
        "pasteImageButton"
    );

const imageSearchInput =
    document.getElementById(
        "imageSearchInput"
    );

const imageSearchButton =
    document.getElementById(
        "imageSearchButton"
    );

const imageSearchStatus =
    document.getElementById(
        "imageSearchStatus"
    );


// ==========================================
// PESQUISAR NO GOOGLE IMAGENS
// ==========================================

if (imageSearchButton) {

    imageSearchButton.addEventListener(
        "click",
        function () {

            const pesquisa =
                imageSearchInput
                    ? imageSearchInput.value.trim()
                    : "";

            if (!pesquisa) {

                if (imageSearchStatus) {

                    imageSearchStatus.textContent =
                        "DIGITE O QUE VOCÊ QUER PESQUISAR.";

                    imageSearchStatus.style.display =
                        "block";
                }

                return;
            }

            const url =
                "https://www.google.com/search?tbm=isch&q=" +
                encodeURIComponent(
                    pesquisa
                );

            window.open(
                url,
                "_blank"
            );

            if (imageSearchStatus) {

                imageSearchStatus.textContent =
                    "PESQUISA ABERTA EM UMA NOVA ABA.";

                imageSearchStatus.style.display =
                    "block";
            }
        }
    );
}

// ==========================================
// FECHAR JANELA DO GOOGLE
// ==========================================

const closeGoogleSearch =
    document.getElementById(
        "closeGoogleSearch"
    );

if (closeGoogleSearch) {

    closeGoogleSearch.addEventListener(
        "click",
        function () {

            const googleSearchWindow =
                document.getElementById(
                    "googleSearchWindow"
                );

            const googleSearchFrame =
                document.getElementById(
                    "googleSearchFrame"
                );

            if (googleSearchWindow) {

                googleSearchWindow.style.display =
                    "none";
            }

            if (googleSearchFrame) {

                googleSearchFrame.src =
                    "about:blank";
            }
        }
    );
}

// ==========================================
// COLAR IMAGEM
// ==========================================

async function colarImagem() {

    try {

        const itens =
            await navigator.clipboard.read();

        for (const item of itens) {

            const tiposImagem =
                item.types.filter(
                    function (tipo) {

                        return tipo.startsWith(
                            "image/"
                        );
                    }
                );

            if (
                tiposImagem.length === 0
            ) {
                continue;
            }

            const blob =
                await item.getType(
                    tiposImagem[0]
                );

            const arquivo =
                new File(
                    [blob],
                    "imagem-colada." +
                    tiposImagem[0].split("/")[1],
                    {
                        type: tiposImagem[0]
                    }
                );

            loadImage(
                arquivo
            );

            if (imageSearchStatus) {

                imageSearchStatus.textContent =
                    "IMAGEM ADICIONADA AO TABULEIRO.";

                imageSearchStatus.style.display =
                    "block";
            }

            return;
        }

        if (imageSearchStatus) {

            imageSearchStatus.textContent =
                "NÃO FOI ENCONTRADA UMA IMAGEM COPIADA.";

            imageSearchStatus.style.display =
                "block";
        }

    } catch (erro) {

        console.error(
            "Erro ao colar imagem:",
            erro
        );

        if (imageSearchStatus) {

            imageSearchStatus.textContent =
                "NÃO FOI POSSÍVEL ACESSAR A IMAGEM COPIADA.";

            imageSearchStatus.style.display =
                "block";
        }
    }
}


// ==========================================
// BOTÃO COLAR IMAGEM
// ==========================================

if (pasteImageButton) {

    pasteImageButton.addEventListener(
        "click",
        colarImagem
    );
}


// ==========================================
// CTRL + V
// ==========================================

document.addEventListener(
    "paste",
    function (evento) {

        const itens =
            evento.clipboardData?.items;

        if (!itens) {
            return;
        }

        for (const item of itens) {

            if (
                !item.type.startsWith(
                    "image/"
                )
            ) {
                continue;
            }

            const arquivo =
                item.getAsFile();

            if (!arquivo) {
                return;
            }

            evento.preventDefault();

            loadImage(
                arquivo
            );

            if (imageSearchStatus) {

                imageSearchStatus.textContent =
                    "IMAGEM ADICIONADA AO TABULEIRO.";

                imageSearchStatus.style.display =
                    "block";
            }

            return;
        }
    }
);