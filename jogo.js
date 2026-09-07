// ==========================================
// CARA A CARA MAKER
// FUNCIONAMENTO DO JOGO
// ==========================================


// ==========================================
// ESTADO DA PARTIDA
// ==========================================

let gameCards = [];

let myBoardImages = [];
let opponentBoardImages = [];

let selectedCharacter = null;
let opponentCharacter = null;

let characterChoiceConfirmed = false;
let opponentChoiceConfirmed = false;

let gameStarted = false;

let gameInitialized = false;


// ==========================================
// ELEMENTOS DO JOGO
// ==========================================

let gameScreen = null;
let characterChoiceScreen = null;

let gameBoard = null;
let choiceBoard = null;

let betButton = null;
let leaveGameButton = null;

let gameStatus = null;
let gameRoomCode = null;
let choiceRoomCode = null;


// ==========================================
// INICIALIZAR ELEMENTOS
// ==========================================

function initializeGameElements() {

    gameScreen =
        document.getElementById("game");

    characterChoiceScreen =
        document.getElementById("characterChoice");

    gameBoard =
        document.getElementById("gameBoard");

    choiceBoard =
        document.getElementById("choiceBoard");

    betButton =
        document.getElementById("betButton");

    leaveGameButton =
        document.getElementById("leaveGameButton");

    gameStatus =
        document.getElementById("gameStatus");

    gameRoomCode =
        document.getElementById("gameRoomCode");

    choiceRoomCode =
        document.getElementById("choiceRoomCode");


    // ======================================
    // BOTÃO APOSTA
    // ======================================

    if (betButton) {

        betButton.addEventListener(
            "click",
            function () {

                openBetConfirmation();
            }
        );
    }


    // ======================================
    // BOTÃO SAIR
    // ======================================

    if (leaveGameButton) {

        leaveGameButton.addEventListener(
            "click",
            function () {

                confirmLeaveGame();
            }
        );
    }
}


// ==========================================
// GARANTIR QUE O DOM FOI CARREGADO
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeGameElements();
    }
);


// ==========================================
// RECEBER OS 12 PERSONAGENS
// ==========================================
//
// Esta função será chamada pelo script.js
// quando o servidor enviar os dois tabuleiros.
//
// images1 = 6 imagens do jogador 1
// images2 = 6 imagens do jogador 2
// ==========================================

function receiveGameBoards(
    images1,
    images2
) {

    if (!Array.isArray(images1)) {
        images1 = [];
    }

    if (!Array.isArray(images2)) {
        images2 = [];
    }


    myBoardImages =
        playerNumber === 1
            ? images1
            : images2;


    opponentBoardImages =
        playerNumber === 1
            ? images2
            : images1;


    gameCards = [];


    // ======================================
    // JOGADOR 1
    // ======================================

    images1.forEach(
        function (image, index) {

            gameCards.push({
                image: image,
                owner: 1,
                originalPosition: index,
                raised: true
            });
        }
    );


    // ======================================
    // JOGADOR 2
    // ======================================

    images2.forEach(
        function (image, index) {

            gameCards.push({
                image: image,
                owner: 2,
                originalPosition: index,
                raised: true
            });
        }
    );


    shuffleGameCards();


    openCharacterChoice();
}


// ==========================================
// EMBARALHAR AS 12 CARTAS
// ==========================================

function shuffleGameCards() {

    for (
        let i = gameCards.length - 1;
        i > 0;
        i--
    ) {

        const random =
            Math.floor(
                Math.random() * (i + 1)
            );


        const temp =
            gameCards[i];

        gameCards[i] =
            gameCards[random];

        gameCards[random] =
            temp;
    }
}


// ==========================================
// ESCOLHA DO PERSONAGEM
// ==========================================

function openCharacterChoice() {

if (!characterChoiceScreen) {
    return;
}


if (choiceRoomCode) {

    choiceRoomCode.textContent =
        roomCode || "----";
}


renderCharacterChoice();


showScreen(
    characterChoiceScreen
);

}


// ==========================================
// MOSTRAR AS 12 CARTAS
// ==========================================

function renderCharacterChoice() {

    if (!choiceBoard) {
        return;
    }


    characterChoiceConfirmed = false;

    opponentChoiceConfirmed = false;

    selectedCharacter = null;


    hideWaitingOverlay();


    const choiceStatus =
        document.getElementById("choiceStatus");

    if (choiceStatus) {

        choiceStatus.style.display = "none";
    }


    choiceBoard.innerHTML = "";


    gameCards.forEach(
        function (card, index) {

            const cardElement =
                createGameCard(
                    card,
                    index,
                    true
                );


            cardElement.classList.remove("disabled");


            choiceBoard.appendChild(
                cardElement
            );
        }
    );
}


// ==========================================
// CRIAR CARTA
// ==========================================

function createGameCard(
    card,
    index,
    choosing
) {

    const cardElement =
        document.createElement("div");


    cardElement.className =
        "game-card";

    if (card.wrong) {

    cardElement.classList.add(
        "wrong-guess"
     );
    }

    cardElement.dataset.index =
        index;


    // ======================================
    // FRENTE
    // ======================================

    const front =
        document.createElement("div");


    front.className =
        "game-card-face game-card-front";


    const image =
        document.createElement("img");


    image.src =
        card.image;


    image.alt =
        "Personagem";


    front.appendChild(
        image
    );


    // ======================================
    // VERSO
    // ======================================

    const back =
        document.createElement("div");


    back.className =
        "game-card-face game-card-back";


    back.textContent =
        "";


    // ======================================
    // ESTRUTURA
    // ======================================

    cardElement.appendChild(
        front
    );

    cardElement.appendChild(
        back
    );


    // ======================================
    // ESCOLHA DO PERSONAGEM
    // ======================================

    if (choosing) {

        cardElement.addEventListener(
            "click",
            function () {

                selectCharacter(
                    index,
                    cardElement
                );
            }
        );

        return cardElement;
    }


    // ======================================
    // JOGO NORMAL
    // ======================================

    cardElement.addEventListener(
        "click",
        function () {

            toggleGameCard(
                index,
                cardElement
            );
        }
    );


    return cardElement;
}


// ==========================================
// SELECIONAR PERSONAGEM
// ==========================================

function selectCharacter(
    index,
    element
) {

    if (characterChoiceConfirmed) {
        return;
    }


    document
        .querySelectorAll(
            "#choiceBoard .game-card"
        )
        .forEach(
            function (card) {

                card.classList.remove(
                    "selected"
                );
            }
        );


    element.classList.add(
        "selected"
    );


    selectedCharacter =
        gameCards[index];


    openCharacterConfirmation();
}


// ==========================================
// CONFIRMAR PERSONAGEM
// ==========================================

function openCharacterConfirmation() {

    if (!selectedCharacter) {
        return;
    }


    const image =
        selectedCharacter.image;


    openCustomPopup(
        "CONFIRMAR PERSONAGEM?",
        "Você escolheu este personagem.",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {}
            },
            {
                text: "CONFIRMAR",
                secondary: false,
                action: function () {

                    confirmCharacter(
                        image
                    );
                }
            }
        ],
        image
    );
}


// ==========================================
// CONFIRMAR PERSONAGEM ESCOLHIDO
// ==========================================

function confirmCharacter(image) {

    characterChoiceConfirmed =
        true;


    if (gameStatus) {

        gameStatus.textContent =
            "PERSONAGEM CONFIRMADO. AGUARDANDO O OUTRO JOGADOR...";
    }


    showWaitingOverlay(
        "AGUARDANDO O ADVERSÁRIO",
        "Você escolheu seu personagem. Aguarde o outro jogador escolher."
    );


    // ======================================
    // AVISAR O SERVIDOR
    // ======================================

    sendGameMessage({
        type: "character_selected",
        image: image
    });


    // ======================================
    // VERIFICAR SE OS DOIS JÁ CONFIRMARAM
    // ======================================

    if (
        characterChoiceConfirmed &&
        opponentChoiceConfirmed
    ) {

        startGame();
    }
}


// ==========================================
// OVERLAY DE ESPERA
// ==========================================

function showWaitingOverlay(title, text) {

    const overlay =
        document.getElementById("waitingOverlay");

    if (!overlay) return;


    const titleEl =
        document.getElementById("waitingOverlayTitle");

    const textEl =
        document.getElementById("waitingOverlayText");


    if (titleEl && title) titleEl.textContent = title;

    if (textEl && text) textEl.textContent = text;


    document.body.classList.add("waiting-active");

    overlay.style.display = "flex";
}


function hideWaitingOverlay() {

    document.body.classList.remove("waiting-active");

    const overlay =
        document.getElementById("waitingOverlay");

    if (overlay) {

        overlay.style.display = "none";
    }
}


function applyPlayerTheme() {

    const num = String(playerNumber);

    if (num === "1") {
        document.body.classList.add("player-1-theme");
        document.body.classList.remove("player-2-theme");
    } else if (num === "2") {
        document.body.classList.add("player-2-theme");
        document.body.classList.remove("player-1-theme");
    }
}


// ==========================================
// OUTRO JOGADOR CONFIRMOU
// ==========================================

function opponentCharacterConfirmed() {

    opponentChoiceConfirmed =
        true;


    if (
        characterChoiceConfirmed &&
        opponentChoiceConfirmed
    ) {

        startGame();
    }
}


// ==========================================
// INICIAR JOGO
// ==========================================

function startGame() {

    if (gameStarted) {
        return;
    }


    hideWaitingOverlay();


    applyPlayerTheme();


    gameStarted = true;

    gameInitialized = true;


    if (gameRoomCode) {

        gameRoomCode.textContent =
            roomCode || "----";
    }


    if (gameStatus) {

        gameStatus.textContent =
            "ENCONTRE O PERSONAGEM DO ADVERSÁRIO!";
    }


    renderGameBoard();


    showScreen(
        gameScreen
    );
}

// ==========================================
// INICIAR NOVA RODADA
// ==========================================

function startNewRound() {
    
     hideWaitingOverlay();


    gameStarted = true;

    gameInitialized = true;


    if (gameRoomCode) {

        gameRoomCode.textContent =
            roomCode || "----";
    }


    if (gameStatus) {

        gameStatus.textContent =
            "ENCONTRE O PERSONAGEM DO ADVERSÁRIO!";
    }


    renderGameBoard();


    showScreen(
        gameScreen
    );
}

// ==========================================
// RENDERIZAR TABULEIRO
// ==========================================

function renderGameBoard() {

    if (!gameBoard) {
        return;
    }


    gameBoard.innerHTML = "";


    gameCards.forEach(
        function (card, index) {

            const element =
                createGameCard(
                    card,
                    index,
                    false
                );


            if (!card.raised) {

                element.classList.add(
                    "flipped"
                );
            }


            gameBoard.appendChild(
                element
            );
        }
    );
}


// ==========================================
// LEVANTAR / ABAIXAR CARTA
// ==========================================

function toggleGameCard(
    index,
    element
) {

    if (!gameStarted) {
        return;
    }

    if (betInProgress){
        return;
    }

    const card =
        gameCards[index];


    if (!card) {
        return;
    }


    card.raised =
        !card.raised;


    element.classList.toggle(
        "flipped",
        !card.raised
    );


    // ======================================
    // AVISAR SERVIDOR
    // ======================================

    sendGameMessage({
        type: "card_toggle",
        index: index,
        raised: card.raised
    });


    // ======================================
    // VERIFICAR SE SOBROU APENAS 1 CARTA EM PÉ
    // ======================================

    const standingCards = gameCards.filter(function(c) { return c.raised && !c.wrong; });

    if (standingCards.length !== 1) {
        betAutoDismissed = false;
    } else if (standingCards.length === 1 && !card.raised && !betAutoDismissed) {
        setTimeout(function() {
            openBetConfirmation();
        }, 300);
    }
}


// ==========================================
// APOSTA
// ==========================================

let betAutoDismissed = false;
let betInProgress = false;

function openBetConfirmation() {

    if (!gameStarted) return;

    if (betInProgress) return;


    const standingCards = gameCards.filter(function (c) {
        return c.raised && !c.wrong;
    });


    if (standingCards.length === 0) {

        openCustomPopup(
            "SEM CARTAS EM PÉ",
            "Não há cartas em pé no seu tabuleiro para apostar.",
            [{ text: "OK", secondary: false, action: function () {} }]
        );

        return;
    }


    // A partir daqui existe uma aposta válida
    betInProgress = true;

    // Avisar adversário que a aposta está em andamento
    sendGameMessage({
        type: "bet_in_progress"
    });


    // ======================================
    // CASO 1: APENAS 1 CARTA EM PÉ
    // ======================================

    if (standingCards.length === 1) {

        const singleCard = standingCards[0];

        const singleIndex = gameCards.indexOf(singleCard);


        openCustomPopup(
            "CONFIRMAR APOSTA?",
            "Deseja apostar nesta única carta restante?",
            [
                {
                    text: "CANCELAR",
                    secondary: true,
                    action: function () {

                        betAutoDismissed = true;
                        betInProgress = false;

                        sendGameMessage({ type: "bet_cancelled" });

                        closePopup();
                    }
                },
                {
                    text: "CONFIRMAR APOSTA",
                    secondary: false,
                    action: function () {

                        sendBet(singleCard, singleIndex);
                    }
                }
            ],
            singleCard.image
        );

        return;
    }


    // ======================================
    // CASO 2: VÁRIAS CARTAS EM PÉ (MINI TABULEIRO NO POPUP)
    // ======================================

    let selectedCardInPopup = null;


    openCustomPopup(
        "FAÇA SUA APOSTA",
        "Clique na carta desejada no mini tabuleiro abaixo para selecionar:",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {

                    betInProgress = false;

                    sendGameMessage({ type: "bet_cancelled" });

                    closePopup();
                }
            },
            {
                text: "CONFIRMAR APOSTA",
                secondary: false,
                action: function () {

                    if (selectedCardInPopup) {

                        const cardIdx = gameCards.indexOf(selectedCardInPopup);

                        sendBet(selectedCardInPopup, cardIdx);
                    }
                }
            }
        ]
    );


    const popupContent =
        gamePopup.querySelector(".game-popup");

    const popupActions =
        popupContent.querySelector(".popup-actions");


    // Desativar botão até selecionar
    const confirmBtn =
        popupActions.querySelector(".popup-button:not(.secondary)");

    if (confirmBtn) {

        confirmBtn.disabled = true;

        confirmBtn.style.opacity = "0.5";

        confirmBtn.style.cursor = "not-allowed";
    }


    const betGrid =
        document.createElement("div");

    betGrid.className =
        "bet-popup-grid";

    betGrid.style.cssText =
        "display: grid; grid-template-columns: repeat(auto-fit, minmax(65px, 1fr)); gap: 10px; margin: 15px 0; max-height: 230px; overflow-y: auto; padding: 5px; justify-items: center;";


    standingCards.forEach(function (card) {

        const cardImg =
            document.createElement("img");

        cardImg.src =
            card.image;

        cardImg.className =
            "bet-grid-item";

        cardImg.style.cssText =
            "width: 65px; height: 85px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 3px solid #ddd; transition: all 0.2s;";


        cardImg.onclick = function () {

            betGrid.querySelectorAll(".bet-grid-item").forEach(function (el) {

                el.classList.remove("selected");

                el.style.border = "3px solid #ddd";

                el.style.transform = "scale(1)";
            });


            selectedCardInPopup = card;

            cardImg.classList.add("selected");

            cardImg.style.border = "4px solid #3b82f6";

            cardImg.style.transform = "scale(1.1)";


            if (confirmBtn) {

                confirmBtn.disabled = false;

                confirmBtn.style.opacity = "1";

                confirmBtn.style.cursor = "pointer";
            }
        };


        betGrid.appendChild(cardImg);
    });


    popupContent.insertBefore(
        betGrid,
        popupActions
    );
}


// ==========================================
// CONFIRMAR APOSTA
// ==========================================

function confirmBet(card) {

    if (!card) {
        return;
    }


    disableBetSelection();


    openCustomPopup(
        "CONFIRMAR APOSTA?",
        "Você realmente quer apostar neste personagem?",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {

                    disableBetSelection();
                }
            },
            {
                text: "APOSTAR",
                secondary: false,
                action: function () {

                    sendBet(card);
                }
            }
        ],
        card.image
    );
}


// ==========================================
// ENVIAR APOSTA
// ==========================================

function sendBet(card) {

    if (!card) {
        return;
    }


    const cardIndex =
        gameCards.indexOf(card);


    if (cardIndex === -1) {
        return;
    }


    showWaitingOverlay(
        "APOSTA ENVIADA",
        "Aguardando o adversário revelar se você acertou..."
    );


    sendGameMessage({
        type: "make_bet",
        card_image: card.image,
        card_index: cardIndex
    });


    if (gameStatus) {

        gameStatus.textContent =
            "AGUARDANDO RESULTADO...";
    }
}


// ==========================================
// DESATIVAR APOSTA
// ==========================================

function disableBetSelection() {

    document
        .querySelectorAll(
            "#gameBoard .game-card"
        )
        .forEach(
            function (element) {

                element.classList.remove(
                    "bet-selection"
                );


                element.onclick = null;
            }
        );


    // Reativar clique normal

    document
        .querySelectorAll(
            "#gameBoard .game-card"
        )
        .forEach(
            function (element) {

                const index =
                    Number(
                        element.dataset.index
                    );


                element.onclick =
                    function () {

                        toggleGameCard(
                            index,
                            element
                        );
                    };
            }
        );
}


// ==========================================
// APOSTA CORRETA
// ==========================================

function handleCorrectBet() {

    openCustomPopup(
        "VOCÊ ACERTOU!",
        "Você encontrou o personagem do adversário!",
        [
            {
                text: "CONTINUAR",
                secondary: false,
                action: function () {

                    finishGame();
                }
            }
        ]
    );
}


// ==========================================
// APOSTA ERRADA
// ==========================================

function handleWrongBet() {

    openCustomPopup(
        "VOCÊ ERROU!",
        "Você não encontrou o personagem do adversário.",
        [
            {
                text: "REVELAR PERSONAGEM",
                secondary: false,
                action: function () {

                    revealOpponentCharacter();
                }
            },
            {
                text: "CONTINUAR",
                secondary: true,
                action: function () {

                    resetMyBoard();
                }
            }
        ]
    );
}


// ==========================================
// REVELAR PERSONAGEM
// ==========================================

function revealOpponentCharacter() {

    if (!opponentCharacter) {

        openCustomPopup(
            "PERSONAGEM",
            "O personagem escolhido pelo adversário ainda não foi recebido.",
            [
                {
                    text: "CONTINUAR",
                    secondary: false,
                    action: function () {

                        resetMyBoard();
                    }
                }
            ]
        );

        return;
    }


    openCustomPopup(
        "O PERSONAGEM ERA:",
        "Este era o personagem escolhido pelo outro jogador.",
        [
            {
                text: "CONTINUAR",
                secondary: false,
                action: function () {

                    resetMyBoard();
                }
            }
        ],
        opponentCharacter
    );
}


// ==========================================
// RESETAR MEU TABULEIRO
// ==========================================

function resetMyBoard() {

    gameCards.forEach(
        function (card) {

            card.raised = true;
        }
    );


    renderGameBoard();


    if (gameStatus) {

        gameStatus.textContent =
            "A PARTIDA CONTINUA. FAÇA SUAS DEDUÇÕES.";
    }


    sendGameMessage({
        type: "reset_board"
    });
}

// ==========================================
// RESET PARA NOVA RODADA
// ==========================================

function resetForNewRound() {

    gameCards.forEach(
        function (card) {

            card.raised = true;
        }
    );


    renderGameBoard();
}

// ==========================================
// FINALIZAR PARTIDA
// ==========================================

function finishGame() {

    if (gameStatus) {

        gameStatus.textContent =
            "VOCÊ VENCEU!";
    }


    if (betButton) {

        betButton.disabled =
            true;
    }
}


// ==========================================
// ABANDONAR PARTIDA
// ==========================================

function confirmLeaveGame() {

    openCustomPopup(
        "ABANDONAR PARTIDA?",
        "Seu tabuleiro será perdido.",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {}
            },
            {
                text: "ABANDONAR",
                secondary: false,
                action: function () {

                    leaveGame();
                }
            }
        ]
    );
}


// ==========================================
// SAIR
// ==========================================

function leaveGame() {

    sendGameMessage({
        type: "leave_game"
    });


    resetAllGameVariables();


    showScreen(
        lobby
    );
}


// ==========================================
// RESETAR TODAS AS VARIÁVEIS DO JOGO
// ==========================================

function resetAllGameVariables() {

    gameCards = [];

    selectedCharacter = null;

    opponentCharacter = null;

    characterChoiceConfirmed = false;

    opponentChoiceConfirmed = false;

    gameStarted = false;

    gameInitialized = false;

    betAutoDismissed = false;

    betInProgress = false;

    document.body.classList.remove(
        "player-1-theme",
        "player-2-theme"
    );


    hideWaitingOverlay();


    const choiceStatus =
        document.getElementById("choiceStatus");

    if (choiceStatus) {

        choiceStatus.style.display = "none";
    }
}


// ==========================================
// ENVIAR MENSAGEM PELO WEBSOCKET
// ==========================================

function sendGameMessage(message) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        console.error(
            "WebSocket não está conectado."
        );

        return;
    }


    try {

        socket.send(
            JSON.stringify(message)
        );

    } catch (error) {

        console.error(
            "Erro ao enviar mensagem:",
            error
        );
    }
}


// ==========================================
// POPUP ESPECIAL DO JOGO
// ==========================================

    function openCustomPopup(
        title,
        message,
        buttons,
        image = null,
        unused = false,
        extraText = null
    ) {

        if (!gamePopup) {
            return;
        }


        const popupContent =
            gamePopup.querySelector(".game-popup");


        if (!popupContent) {
            return;
        }


        const popupTitle =
            popupContent.querySelector("h2");


        const popupMessage =
            popupContent.querySelector("p");


        const popupActions =
            popupContent.querySelector(".popup-actions");


        // Oculta a prévia de 6 slots por padrão nos popups comuns
        const popupBoard =
            popupContent.querySelector("#popupBoard");

        if (popupBoard) {
            popupBoard.style.display = "none";
        }


        // Remove grade de aposta ou input anterior se houver
        let existingBetGrid =
            popupContent.querySelector(".bet-popup-grid");

        if (existingBetGrid) {
            existingBetGrid.remove();
        }

        let existingInput =
            popupContent.querySelector("#restoreCodeInput");

        if (existingInput) {
            existingInput.remove();
        }


        if (!popupTitle || !popupMessage || !popupActions) {
            return;
        }


        popupTitle.textContent =
            title;


        popupMessage.textContent =
            message;


        popupActions.innerHTML =
            "";


        // ======================================
        // IMAGEM
        // ======================================

        let existingImage =
            popupContent.querySelector(
                ".popup-character-image"
            );


        if (existingImage) {

            existingImage.remove();
        }


        // Remove código salvo anterior
        let existingCode =
            popupContent.querySelector(
                ".saved-game-code"
            );


        if (existingCode) {

            existingCode.remove();
        }


        if (image) {

            const imageElement =
                document.createElement("img");


            imageElement.className =
                "popup-character-image";


            imageElement.src =
                image;


            imageElement.alt =
                "Personagem";


            popupContent.insertBefore(

                imageElement,
                popupActions

            );
        }


        // ======================================
        // TEXTO EXTRA
        // ======================================

        if (extraText) {

            const codeElement =
                document.createElement("div");


            codeElement.className =
                "saved-game-code";


            codeElement.textContent =
                extraText;


            popupContent.insertBefore(

                codeElement,
                popupActions

            );
        }


        // ======================================
        // BOTÕES
        // ======================================

        buttons.forEach(
            function (buttonData) {

                const button =
                    document.createElement(
                        "button"
                    );


                button.className =
                    "popup-button";


                if (
                    buttonData.secondary
                ) {

                    button.classList.add(
                        "secondary"
                    );
                }


                button.textContent =
                    buttonData.text;


                button.addEventListener(
                    "click",
                    function () {

                        closePopup();


                        if (
                            typeof buttonData.action ===
                            "function"
                        ) {

                            buttonData.action();
                        }
                    }
                );


                popupActions.appendChild(
                    button
                );
            }
        );


        gamePopup.classList.add(
            "active"
        );
    }

// ==========================================
// RECEBER MENSAGENS DO SERVIDOR
// ==========================================

function handleGameMessage(data) {

    if (!data || !data.type) {
        return;
    }


    // ======================================
    // TABULEIROS RECEBIDOS
    // ======================================

    if (
        data.type ===
        "game_boards"
    ) {

        receiveGameBoards(
            data.player1,
            data.player2
        );

        applyPlayerTheme();

        return;
    }


    // ======================================
    // APOSTA EM ANDAMENTO
    // ======================================

    if (
        data.type ===
        "bet_in_progress"
    ) {

        betInProgress = true;

        showWaitingOverlay(
            "O ADVERSÁRIO ESTÁ APOSTANDO...",
            "Aguarde o outro jogador escolher uma carta para apostar."
        );

        return;
    }


    if (
        data.type ===
        "bet_cancelled"
    ) {

        betInProgress = false;

        hideWaitingOverlay();

        return;
    }


    // ======================================
    // PERSONAGEM DO ADVERSÁRIO
    // ======================================

    if (
        data.type ===
        "opponent_character"
    ) {

        opponentCharacter =
            data.image;


        opponentCharacterConfirmed();


        return;
    }


    // ======================================
    // OUTRO JOGADOR CONFIRMOU
    // ======================================

    if (
        data.type ===
        "character_confirmed"
    ) {

        opponentCharacterConfirmed();


        return;
    }


    // ======================================
    // CARTA DO OUTRO JOGADOR (INDEPENDENTE)
    // ======================================

    if (
        data.type ===
        "card_toggle"
    ) {

        // Viradas de cartas são locais e independentes entre jogadores
        return;
    }


    // ==========================================
    // ADVERSÁRIO FEZ UMA APOSTA
    // ==========================================

    if (
        data.type ===
        "make_bet"
    ) {

        hideWaitingOverlay();

        openCustomPopup(
            "O ADVERSÁRIO FEZ UMA APOSTA!",
            "O outro jogador apostou no personagem abaixo. Clique em REVELAR para conferir a resposta!",
            [
                {
                    text: "REVELAR",
                    secondary: false,
                    action: function () {

                        // ==================================
                        // AVISAR O SERVIDOR QUE A RESPOSTA
                        // FOI REVELADA
                        // ==================================

                        sendGameMessage({
                            type: "reveal_bet_result"
                        });
                    }
                }
            ],
            data.card_image
        );

        return;
    }

    // ======================================
    // RESULTADO DA SUA APOSTA
    // ======================================

    if (
        data.type ===
        "bet_result"
    ) {

        betInProgress = false;

        hideWaitingOverlay();


        if (data.correct) {

            openCustomPopup(
                "VOCÊ VENCEU!",
                "Parabéns! Você descobriu o personagem do adversário!",
                [{ text: "OK", secondary: false, action: function () {} }],
                data.bet_image
            );


        } else {

            const card =
                gameCards[data.bet_index];

            if (card) {

                card.wrong = true;

                card.raised = false;
            }


            const element =
                document.querySelector('#gameBoard .game-card[data-index="' + data.bet_index + '"]');

            if (element) {

                element.classList.add("wrong-guess", "flipped");

                element.onclick = null;
            }


            openCustomPopup(
                "APOSTA INCORRETA!",
                "Você errou o personagem do adversário. A carta foi marcada com um X grande e virada. A partida continua!",
                [{ text: "CONTINUAR", secondary: false, action: function () {} }],
                data.bet_image
            );
        }


        return;
    }

    // ==========================================
    // RESULTADO DA APOSTA PARA QUEM RECEBEU
    // ==========================================

    if (data.type === "bet_resolved") {

        betInProgress = false;

        hideWaitingOverlay();

        if (data.correct) {

            openCustomPopup(
                "VOCÊ PERDEU!",
                "O adversário acertou o seu personagem!",
                [
                    {
                        text: "OK",
                        secondary: false,
                        action: function () {}
                    }
                ],
                data.bet_image
            );


        } else {

            openCustomPopup(
                "ELE ERROU!",
                "O adversário errou o seu personagem. A partida continua!",
                [
                    {
                        text: "CONTINUAR",
                        secondary: false,
                        action: function () {}
                    }
                ],
                data.bet_image
            );
        }

        return;
    }

    // ==========================================
    // VENCEU A APOSTA
    // ==========================================

    if (data.type === "bet_won") {

        betInProgress = false;

        hideWaitingOverlay();


        // O vencedor continua com o próprio
        // personagem secreto.
        // Apenas o tabuleiro da investigação
        // é resetado.

        gameCards.forEach(
            function (card) {

                card.raised = true;
                card.wrong = false;
            }
        );


        renderGameBoard();


        if (gameStatus) {

            gameStatus.textContent =
                "VOCÊ ACERTOU!";
        }


        openCustomPopup(
            "VOCÊ VENCEU A RODADA!",
            "Você descobriu o personagem do adversário. Ele deverá escolher um novo personagem.",
            [
                {
                    text: "CONTINUAR",
                    secondary: false,
                    action: function () {}
                }
            ],
            data.bet_image
        );


        return;
    }

    // ==========================================
    // PERDEU A APOSTA
    // ==========================================

if (data.type === "bet_lost") {

    betInProgress = false;

    hideWaitingOverlay();


    openCustomPopup(
        "SEU PERSONAGEM FOI DESCOBERTO!",
        "Você perdeu esta rodada. Escolha um novo personagem para o adversário descobrir.",
        [
            {
                text: "ESCOLHER PERSONAGEM",
                secondary: false,
                action: function () {

                    openCharacterChoice();
                }
            }
        ],
        data.bet_image
    );


    return;
}

    if (data.type === "new_round_start") {

    if (data.opponent_character) {

        opponentCharacter =
            data.opponent_character;
    }

    startNewRound();

    return;
    }

    // ======================================
    // PERSONAGEM REVELADO
    // ======================================

    if (
        data.type ===
        "reveal_character"
    ) {

        opponentCharacter =
            data.image;


        revealOpponentCharacter();


        return;
    }

}


// ==========================================
// ATUALIZAR CARTA REMOTAMENTE
// ==========================================

function updateRemoteCard(
    index,
    raised
) {

    const card =
        gameCards[index];


    if (!card) {
        return;
    }


    card.raised =
        raised;


    const element =
        document.querySelector(
            '#gameBoard .game-card[data-index="' +
            index +
            '"]'
        );


    if (!element) {
        return;
    }


    element.classList.toggle(
        "flipped",
        !raised
    );
}


// ==========================================
// GARANTIR QUE O JOGO POSSA USAR
// O showScreen DO SCRIPT.JS
// ==========================================

function showGameScreen() {

    showScreen(
        gameScreen
    );

}