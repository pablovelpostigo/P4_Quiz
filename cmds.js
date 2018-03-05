

const {log, biglog, errorlog, colorize} = require("./out");

const model = require('./model');

exports.helpCmd = rl => {
    log("Commandos:");
    log(" h|help - Muestra esta ayuda.");
    log(" list - Listar los quizzes existentes.");
    log(" show <id> - Muesta la pregunta y la respuesta el quiz indicado");
    log(" add - Añadir un nuevo quiz interactivamente.");
    log(" delete <id> - Borra el quiz indicado.");
    log(" edit <id> - Editar el quiz indicado.");
    log(" text <id> - Probar el quiz indicado.");
    log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(" credits - Créditos.");
    log(" q|quiz  - Salir del programa.");
    rl.prompt();
};

exports.listCmd = rl => {

    model.getAll().forEach((quiz, id) => {
        log(`[${colorize(id, 'magenta')}]: ${quiz.question}`);
    });
    rl.prompt();
};

exports.showCmd = (rl, id) => {

    if (typeof id == "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else {
        try {
            const quiz = model.getByIndex(id);
            log(` [${colorize(id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        } catch(error) {
            errorlog(error.message);
        }
    }

    rl.prompt();
};

exports.addCmd = rl => {
    rl.question(colorize('Introduzca una pregunta: ', 'red'), question => {
        rl.question(colorize('Introduzca la respuesta ', 'red'), answer => {

            model.add(question, answer);
            log(` ${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
            rl.prompt();
        });
    });

};

exports.deleteCmd = (rl, id) => {

    if (typeof id == "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else {
        try {
            model.deleteByIndex(id);
        } catch(error) {
            errorlog(error.message);
        }
    }

    rl.prompt();
};


exports.editCmd = (rl, id) => {

    if (typeof id == "undefined") {
        errorlog(`Falta el parámetro id.`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);

            rl.question(colorize('Introduzca una pregunta: ', 'red'), question => {

                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);

                rl.question(colorize('Introduzca la respuesta ', 'red'), answer => {
                    model.update(id, question, answer);
                    log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();

                });
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};


exports.testCmd = (rl, id) => {

    if (typeof id === "undefined") {
        errorlog('Falta el parámetro id.');
        rl.prompt();
    }else {
        try{
            const quiz = model.getByIndex(id);
            const pregunta = quiz.question;
            rl.question(colorize(pregunta + '?', 'red'), answer =>{
                const resp = (answer || "").toLocaleLowerCase().trim()

                if ( resp === quiz.answer.toLocaleLowerCase()){
                    console.log("Su respuesta es:")
                    log('Correcta', 'green');
                    rl.prompt();
                }else{
                    console.log("Su respuesta es:")
                    log('Incorrecta', 'red');
                    rl.prompt();
                }
            });

        }catch(error){
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.playCmd = rl => {

    let score = 0;
    let toBeResolved = [];
    model.getAll().forEach((quiz, id) => {
        toBeResolved.push(id);
    });
    const playOne = () => {
        if (toBeResolved.length === 0) {
            log(`No hay nada más que preguntar.`);
            log(`Fin del examen. Aciertos:` + score);
            biglog(score);
            rl.prompt();
        } else {
            let aleat = Math.floor(Math.random() * toBeResolved.length);
            let idRandom = toBeResolved[aleat];
            const quiz = model.getByIndex(idRandom);
            toBeResolved.splice(aleat, 1);
            rl.question(colorize(`${quiz.question}? =>`, 'red'), resp => {
                if ((resp.toLowerCase().trim()) === (quiz.answer.toLowerCase().trim())) {
                    score = score + 1;
                    log(`Llevas ${score} aciertos`);
                    playOne();
                } else {
                    log("\nRespuesta incorrecta\n");
                    log(`Fin del juego`);
                    log(`Número de aciertos:`);
                    biglog(`${score}`);
                    log("¡Pruebe otra vez!\n");
                    rl.prompt();
                }

            });
        }
    };
    playOne();
};


exports.creditsCmd = rl => {
    log('Autores de la práctica :');
    log ('Alberto Sánchez Delgado', 'green');
    log ('Pablo Velasco Postigo', 'green');
    rl.prompt();
};

exports.quitCmd = rl => {
    rl.close();
};