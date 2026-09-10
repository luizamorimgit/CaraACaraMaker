// ==========================================
// CARA A CARA MAKER
// FUNCIONAMENTO DO JOGO
// VERSÃO 3.0
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
// ESTADO DA PARTIDA
// ==========================================

let matchFinished = false;


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

let matchScoreElement = null;


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

    matchScoreElement =
        document.getElementById("matchScore");


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


    updateMatchScore();
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
// ATUALIZAR PLACAR
// ==========================================
//
// O placar é controlado pelo script.js.
// Esta função apenas garante que o elemento
// esteja atualizado.
// ==========================================

function updateGameScoreDisplay() {

    if (!matchScoreElement) {

        matchScoreElement =
            document.getElementById("matchScore");
    }


    if (!matchScoreElement) {
        return;
    }


    if (
        typeof player1Score === "undefined" ||
        typeof player2Score === "undefined"
    ) {

        return;
    }


    matchScoreElement.textContent =
        "J1 — " +
        player1Score +
        " × " +
        player2Score +
        " — J2";
}


// ==========================================
// RECEBER CONFIGURAÇÃO DA PARTIDA
// ==========================================

function receiveMatchConfig(data) {

    if (!data) {
        return;
    }


    const value =
        Number(data.wins_to_finish);


    if (
        [1, 3, 5, 7].includes(value)
    ) {

        winsToFinish =
            value;
    }


    if (
        data.score &&
        typeof updateMatchScore === "function"
    ) {

        updateMatchScore(
            data.score[1] ?? data.score["1"] ?? 0,
            data.score[2] ?? data.score["2"] ?? 0
        );

    } else {

        updateGameScoreDisplay();
    }


    if (
        typeof matchConfigMode !== "undefined" &&
        matchConfigMode === "change"
    ) {

        matchConfigMode = "create";
        matchConfigController = null;
        matchConfigConfirmed = true;

        if (typeof hideWaitingOverlay === "function") {
            hideWaitingOverlay();
        }

        openCharacterChoice();
    }
}


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


    matchFinished = false;


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


            cardElement.classList.remove(
                "disabled"
            );


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


    if (titleEl && title) {

        titleEl.textContent =
            title;
    }


    if (textEl && text) {

        textEl.textContent =
            text;
    }


    document.body.classList.add(
        "waiting-active"
    );


    overlay.style.display =
        "flex";
}


function hideWaitingOverlay() {

    document.body.classList.remove(
        "waiting-active"
    );


    const overlay =
        document.getElementById("waitingOverlay");


    if (overlay) {

        overlay.style.display =
            "none";
    }
}


function applyPlayerTheme() {

    const num =
        String(playerNumber);


    if (num === "1") {

        document.body.classList.add(
            "player-1-theme"
        );

        document.body.classList.remove(
            "player-2-theme"
        );

    } else if (num === "2") {

        document.body.classList.add(
            "player-2-theme"
        );

        document.body.classList.remove(
            "player-1-theme"
        );
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


    if (betButton) {

        betButton.disabled =
            false;
    }


    updateMatchScore();


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

    matchFinished = false;


    if (gameRoomCode) {

        gameRoomCode.textContent =
            roomCode || "----";
    }


    if (gameStatus) {

        gameStatus.textContent =
            "ENCONTRE O PERSONAGEM DO ADVERSÁRIO!";
    }


    if (betButton) {

        betButton.disabled =
            false;
    }


    updateMatchScore();


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


    if (matchFinished) {
        return;
    }


    if (betInProgress) {
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
    // VERIFICAR SE SOBROU APENAS 1 CARTA
    // ======================================

    const standingCards =
        gameCards.filter(
            function (c) {

                return c.raised &&
                       !c.wrong;
            }
        );


    if (standingCards.length !== 1) {

        betAutoDismissed =
            false;

    } else if (
        standingCards.length === 1 &&
        !card.raised &&
        !betAutoDismissed
    ) {

        setTimeout(
            function () {

                openBetConfirmation();

            },
            300
        );
    }
}


// ==========================================
// APOSTA
// ==========================================

let betAutoDismissed = false;
let betInProgress = false;


function openBetConfirmation() {

    if (!gameStarted) return;

    if (matchFinished) return;

    if (betInProgress) return;


    const standingCards =
        gameCards.filter(
            function (c) {

                return c.raised &&
                       !c.wrong;
            }
        );


    if (standingCards.length === 0) {

        openCustomPopup(
            "SEM CARTAS EM PÉ",
            "Não há cartas em pé no seu tabuleiro para apostar.",
            [
                {
                    text: "OK",
                    secondary: false,
                    action: function () {}
                }
            ]
        );

        return;
    }


    // ======================================
    // APOSTA VÁLIDA
    // ======================================

    betInProgress =
        true;


    sendGameMessage({
        type: "bet_in_progress"
    });


    // ======================================
    // CASO 1: APENAS 1 CARTA EM PÉ
    // ======================================

    if (standingCards.length === 1) {

        const singleCard =
            standingCards[0];


        const singleIndex =
            gameCards.indexOf(
                singleCard
            );


        openCustomPopup(
            "CONFIRMAR APOSTA?",
            "Deseja apostar nesta única carta restante?",
            [
                {
                    text: "CANCELAR",
                    secondary: true,
                    action: function () {

                        betAutoDismissed =
                            true;

                        betInProgress =
                            false;


                        sendGameMessage({
                            type: "bet_cancelled"
                        });
                    }
                },
                {
                    text: "CONFIRMAR APOSTA",
                    secondary: false,
                    action: function () {

                        sendBet(
                            singleCard,
                            singleIndex
                        );
                    }
                }
            ],
            singleCard.image
        );


        return;
    }


    // ======================================
    // CASO 2: VÁRIAS CARTAS
    // ======================================

    let selectedCardInPopup =
        null;


    openCustomPopup(
        "FAÇA SUA APOSTA",
        "Clique na carta desejada no mini tabuleiro abaixo para selecionar:",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {

                    betInProgress =
                        false;


                    sendGameMessage({
                        type: "bet_cancelled"
                    });
                }
            },
            {
                text: "CONFIRMAR APOSTA",
                secondary: false,
                action: function () {

                    if (selectedCardInPopup) {

                        const cardIdx =
                            gameCards.indexOf(
                                selectedCardInPopup
                            );


                        sendBet(
                            selectedCardInPopup,
                            cardIdx
                        );
                    }
                }
            }
        ]
    );


    const popupContent =
        gamePopup.querySelector(
            ".game-popup"
        );


    const popupActions =
        popupContent.querySelector(
            ".popup-actions"
        );


    const confirmBtn =
        popupActions.querySelector(
            ".popup-button:not(.secondary)"
        );


    if (confirmBtn) {

        confirmBtn.disabled =
            true;

        confirmBtn.style.opacity =
            "0.5";

        confirmBtn.style.cursor =
            "not-allowed";
    }


    const betGrid =
        document.createElement("div");


    betGrid.className =
        "bet-popup-grid";


    betGrid.style.cssText =
        "display: grid; grid-template-columns: repeat(auto-fit, minmax(65px, 1fr)); gap: 10px; margin: 15px 0; max-height: 230px; overflow-y: auto; padding: 5px; justify-items: center;";


    standingCards.forEach(
        function (card) {

            const cardImg =
                document.createElement("img");


            cardImg.src =
                card.image;


            cardImg.className =
                "bet-grid-item";


            cardImg.style.cssText =
                "width: 65px; height: 85px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 3px solid #ddd; transition: all 0.2s;";


            cardImg.onclick =
                function () {

                    betGrid
                        .querySelectorAll(
                            ".bet-grid-item"
                        )
                        .forEach(
                            function (el) {

                                el.classList.remove(
                                    "selected"
                                );

                                el.style.border =
                                    "3px solid #ddd";

                                el.style.transform =
                                    "scale(1)";
                            }
                        );


                    selectedCardInPopup =
                        card;


                    cardImg.classList.add(
                        "selected"
                    );


                    cardImg.style.border =
                        "4px solid #3b82f6";


                    cardImg.style.transform =
                        "scale(1.1)";


                    if (confirmBtn) {

                        confirmBtn.disabled =
                            false;

                        confirmBtn.style.opacity =
                            "1";

                        confirmBtn.style.cursor =
                            "pointer";
                    }
                };


            betGrid.appendChild(
                cardImg
            );
        }
    );


    popupContent.insertBefore(
        betGrid,
        popupActions
    );
}


// ==========================================
// ENVIAR APOSTA
// ==========================================

function sendBet(card, optionalIndex = null) {

    if (!card) {
        return;
    }


    const cardIndex =
        optionalIndex !== null
            ? optionalIndex
            : gameCards.indexOf(card);


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


                element.onclick =
                    null;
            }
        );


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

            card.raised =
                true;
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

            card.raised =
                true;

            card.wrong =
                false;
        }
    );


    renderGameBoard();
}


// ==========================================
// VITÓRIA DA RODADA
// ==========================================

function handleRoundWon(data) {

    if (!data) {
        return;
    }


    if (
        data.score &&
        typeof updateMatchScore === "function"
    ) {

        updateMatchScore(
            data.score[1] ?? data.score["1"] ?? 0,
            data.score[2] ?? data.score["2"] ?? 0
        );
    }


    const winner =
        Number(data.winner);


    if (winner === playerNumber) {

        if (gameStatus) {

            gameStatus.textContent =
                "VOCÊ VENCEU A RODADA!";
        }

    } else {

        if (gameStatus) {

            gameStatus.textContent =
                "O ADVERSÁRIO VENCEU A RODADA.";
        }
    }
}


// ==========================================
// ATUALIZAÇÃO DO PLACAR
// ==========================================

function handleScoreUpdate(data) {

    if (!data || !data.score) {
        return;
    }


    if (
        typeof updateMatchScore === "function"
    ) {

        updateMatchScore(
            data.score[1] ?? data.score["1"] ?? 0,
            data.score[2] ?? data.score["2"] ?? 0
        );

    } else {

        updateGameScoreDisplay();
    }
}


// ==========================================
// FINAL DA PARTIDA
// ==========================================

function handleMatchWon(data) {

    if (!data) {
        return;
    }


    matchFinished =
        true;


    gameStarted =
        false;


    betInProgress =
        false;


    hideWaitingOverlay();


    if (
        data.score &&
        typeof updateMatchScore === "function"
    ) {

        updateMatchScore(
            data.score[1] ?? data.score["1"] ?? 0,
            data.score[2] ?? data.score["2"] ?? 0
        );
    }


    const winner =
        Number(data.winner);


    if (betButton) {

        betButton.disabled =
            true;
    }


    if (winner === playerNumber) {

        if (gameStatus) {

            gameStatus.textContent =
                "VOCÊ VENCEU A PARTIDA!";
        }

        // Somente o criador da sala (J1) controla o que acontece depois.
        if (Number(playerNumber) === 1) {

            openMatchFinishedPopup(
                "VOCÊ VENCEU!",
                "Parabéns! Você venceu a partida."
            );

        } else {

            openMatchResultPopup(
                "VOCÊ VENCEU!",
                "Parabéns! Você venceu a partida.",
                true
            );
        }

    } else {

        if (gameStatus) {

            gameStatus.textContent =
                "O ADVERSÁRIO VENCEU A PARTIDA.";
        }

        // O J2 não pode escolher jogar novamente, mudar vitórias ou sair
        // pelo popup final. Ele apenas aguarda o criador (J1).
        if (Number(playerNumber) === 1) {

            openMatchFinishedPopup(
                "VOCÊ PERDEU",
                "O adversário venceu a partida."
            );

        } else {

            openMatchResultPopup(
                "VOCÊ PERDEU",
                "O adversário venceu a partida.",
                false
            );
        }
    }
}


// ==========================================
// RESULTADO DA PARTIDA PARA O J2
// ==========================================

function openMatchResultPopup(
    title,
    message,
    won
) {

    openCustomPopup(
        title,
        message +
        " Placar final: " +
        player1Score +
        " × " +
        player2Score +
        ". Aguardando o criador da sala decidir o próximo passo...",
        []
    );
}


// ==========================================
// POPUP DE PARTIDA ENCERRADA
// ==========================================

function openMatchFinishedPopup(
    title,
    message
) {

    openCustomPopup(
        title,
        message +
        " Placar final: " +
        player1Score +
        " × " +
        player2Score +
        ".",
        [
            {
                text: "JOGAR NOVAMENTE",
                secondary: false,
                action: function () {

                    requestPlayAgain();
                }
            },
            {
                text: "MUDAR VITÓRIAS",
                secondary: true,
                action: function () {

                    requestChangeMatchConfig();
                }
            },
            {
                text: "SAIR DA PARTIDA",
                secondary: true,
                action: function () {

                    leaveGame();
                }
            }
        ]
    );
}


// ==========================================
// JOGAR NOVAMENTE
// ==========================================

function requestPlayAgain() {

    if (Number(playerNumber) !== 1) {
        return;
    }

    sendGameMessage({
        type: "play_again"
    });


    showWaitingOverlay(
        "AGUARDANDO",
        "Aguardando o outro jogador..."
    );
}


// ==========================================
// MUDAR VITÓRIAS
// ==========================================

function requestChangeMatchConfig() {

    if (Number(playerNumber) !== 1) {
        return;
    }

    sendGameMessage({
        type: "change_match_config"
    });


    showWaitingOverlay(
        "CONFIGURAÇÃO",
        "Abrindo a configuração da próxima partida..."
    );
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


    if (typeof backToRoomChoice === "function") {

        backToRoomChoice();

    } else {

        showScreen(
            lobby
        );
    }
}


// ==========================================
// RESETAR TODAS AS VARIÁVEIS DO JOGO
// ==========================================

function resetAllGameVariables() {

    gameCards = [];

    myBoardImages = [];

    opponentBoardImages = [];

    selectedCharacter = null;

    opponentCharacter = null;

    characterChoiceConfirmed =
        false;

    opponentChoiceConfirmed =
        false;

    gameStarted =
        false;

    gameInitialized =
        false;

    betAutoDismissed =
        false;

    betInProgress =
        false;

    matchFinished =
        false;


    if (
        typeof resetMatchScore ===
        "function"
    ) {

        resetMatchScore();

    } else {

        updateGameScoreDisplay();
    }


    if (
        typeof winsToFinish !==
        "undefined"
    ) {

        winsToFinish =
            1;
    }


    document.body.classList.remove(
        "player-1-theme",
        "player-2-theme"
    );


    hideWaitingOverlay();


    const choiceStatus =
        document.getElementById(
            "choiceStatus"
        );


    if (choiceStatus) {

        choiceStatus.style.display =
            "none";
    }
}


// ==========================================
// ENVIAR MENSAGEM PELO WEBSOCKET
// ==========================================
//
// IMPORTANTE:
// Não cria outro WebSocket.
// Usa o socket global do script.js.
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
        gamePopup.querySelector(
            ".game-popup"
        );


    if (!popupContent) {
        return;
    }


    const popupTitle =
        popupContent.querySelector(
            "h2"
        );


    const popupMessage =
        popupContent.querySelector(
            "p"
        );


    const popupActions =
        popupContent.querySelector(
            ".popup-actions"
        );


    // ======================================
    // OCULTAR TABULEIRO DO POPUP
    // ======================================

    const popupBoard =
        popupContent.querySelector(
            "#popupBoard"
        );


    if (popupBoard) {

        popupBoard.style.display =
            "none";
    }


    // ======================================
    // REMOVER ELEMENTOS ANTERIORES
    // ======================================

    const existingBetGrid =
        popupContent.querySelector(
            ".bet-popup-grid"
        );


    if (existingBetGrid) {

        existingBetGrid.remove();
    }


    const existingInput =
        popupContent.querySelector(
            "#restoreCodeInput"
        );


    if (existingInput) {

        existingInput.remove();
    }


    if (
        !popupTitle ||
        !popupMessage ||
        !popupActions
    ) {

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


    // ======================================
    // CÓDIGO SALVO
    // ======================================

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
    // CONFIGURAÇÃO DA PARTIDA
    // ======================================

    if (
        data.type ===
        "match_config"
    ) {

        receiveMatchConfig(
            data
        );


        return;
    }


    // ======================================
    // PLACAR
    // ======================================

    if (
        data.type ===
        "score_update"
    ) {

        handleScoreUpdate(
            data
        );


        return;
    }


    // ======================================
    // VITÓRIA DE RODADA
    // ======================================

    if (
        data.type ===
        "round_won"
    ) {

        handleRoundWon(
            data
        );


        return;
    }


    // ======================================
    // VITÓRIA DA PARTIDA
    // ======================================

    if (
        data.type ===
        "match_won"
    ) {

        handleMatchWon(
            data
        );


        return;
    }


    // ======================================
    // JOGAR NOVAMENTE: AGUARDANDO ADVERSÁRIO
    // ======================================

    if (
        data.type ===
        "play_again_waiting"
    ) {

        showWaitingOverlay(
            "AGUARDANDO",
            "Aguardando o outro jogador..."
        );

        return;
    }


    // ======================================
    // NOVA PARTIDA
    // ======================================

    if (
        data.type ===
        "play_again"
    ) {

        if (
            typeof resetMatchScore ===
            "function"
        ) {

            resetMatchScore();

        } else {

            updateGameScoreDisplay();
        }


        matchFinished =
            false;


        gameStarted =
            false;


        gameInitialized =
            false;


        betInProgress =
            false;


        hideWaitingOverlay();


        openCharacterChoice();


        return;
    }


    // ======================================
    // MUDAR CONFIGURAÇÃO
    // ======================================

    if (
        data.type ===
        "change_match_config"
    ) {

        if (
            typeof resetMatchScore ===
            "function"
        ) {

            resetMatchScore();

        } else {

            updateGameScoreDisplay();
        }


        matchFinished =
            false;


        gameStarted =
            false;


        gameInitialized =
            false;


        betInProgress =
            false;


        hideWaitingOverlay();


        if (
            typeof openMatchConfig ===
            "function"
        ) {

            openMatchConfig(
                "change",
                data.configurator
            );

        } else {

            showScreen(
                lobby
            );
        }


        return;
    }


    // ======================================
    // CONFIGURAÇÃO CONFIRMADA PELO SERVIDOR
    // ======================================

    if (
        data.type ===
        "match_config"
    ) {

        matchFinished = false;
        gameStarted = false;
        gameInitialized = false;
        betInProgress = false;

        hideWaitingOverlay();

        openCharacterChoice();

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

        betInProgress =
            true;


        showWaitingOverlay(
            "O ADVERSÁRIO ESTÁ APOSTANDO...",
            "Aguarde o outro jogador escolher uma carta para apostar."
        );


        return;
    }


    // ======================================
    // APOSTA CANCELADA
    // ======================================

    if (
        data.type ===
        "bet_cancelled"
    ) {

        betInProgress =
            false;


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
    // CARTA DO OUTRO JOGADOR
    // ======================================

    if (
        data.type ===
        "card_toggle"
    ) {

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

                        sendGameMessage({
                            type:
                                "reveal_bet_result"
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

        betInProgress =
            false;


        hideWaitingOverlay();


        if (data.correct) {

            openCustomPopup(
                "VOCÊ VENCEU!",
                "Você descobriu o personagem do adversário!",
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

            const card =
                gameCards[data.bet_index];


            if (card) {

                card.wrong =
                    true;

                card.raised =
                    false;
            }


            const element =
                document.querySelector(
                    '#gameBoard .game-card[data-index="' +
                    data.bet_index +
                    '"]'
                );


            if (element) {

                element.classList.add(
                    "wrong-guess",
                    "flipped"
                );


                element.onclick =
                    null;
            }


            openCustomPopup(
                "APOSTA INCORRETA!",
                "Você errou o personagem do adversário. A carta foi marcada com um X grande e virada. A partida continua!",
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
    // RESULTADO DA APOSTA PARA QUEM RECEBEU
    // ==========================================

    if (
        data.type ===
        "bet_resolved"
    ) {

        betInProgress =
            false;


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

    if (
        data.type ===
        "bet_won"
    ) {

        betInProgress =
            false;


        // O servidor envia o placar junto com a vitória.
        // Isso garante que a pontuação seja atualizada
        // imediatamente no cliente vencedor.
        if (
            data.score &&
            typeof updateMatchScore === "function"
        ) {

            updateMatchScore(
                data.score[1] ?? data.score["1"] ?? player1Score,
                data.score[2] ?? data.score["2"] ?? player2Score
            );

        } else if (
            typeof updateMatchScore === "function" &&
            typeof playerNumber !== "undefined"
        ) {

            // Compatibilidade com servidor antigo que envia bet_won
            // sem o placar.
            if (Number(playerNumber) === 1) {
                updateMatchScore(player1Score + 1, player2Score);
            } else {
                updateMatchScore(player1Score, player2Score + 1);
            }
        }


        hideWaitingOverlay();


        gameCards.forEach(
            function (card) {

                card.raised =
                    true;

                card.wrong =
                    false;
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

    if (
        data.type ===
        "bet_lost"
    ) {

        betInProgress =
            false;


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


    // ==========================================
    // NOVA RODADA
    // ==========================================

    if (
        data.type ===
        "new_round_start"
    ) {

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