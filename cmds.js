
const Sequelize = require('sequelize');

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');


const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id); //coger la parte entera y descartar lo demás
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};


const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim()); //trim para quitar espacios en blanco vacios por delante y por detrás
        });
    });
};


exports.helpCmd = rl => {
    log("Commandos:");
    log(" h|help - Muestra esta ayuda.");
    log(" list - Listar los quizzes existentes.");
    log(" show <id> - Muesta la pregunta y la respuesta el quiz indicado");
    log(" add - Añadir un nuevo quiz interactivamente.");
    log(" delete <id> - Borra el quiz indicado.");
    log(" edit <id> - Editar el quiz indicado.");
    log(" test <id> - Probar el quiz indicado.");
    log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(" credits - Créditos.");
    log(" q|quiz  - Salir del programa.");
    rl.prompt();
};

exports.listCmd = rl => {

        models.quiz.findAll()
        .each(quiz => {
            log(`[${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
}




exports.showCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(`[${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};




exports.addCmd = rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta ')
                .then(a => {
                    return {question:q, answer:a};
                });
            })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();

        });

};

exports.deleteCmd = (rl, id) => {

    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.editCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
            return makeQuestion(rl, ' Introduzca la pregunta: ')
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, 'Introduzca la respuesta: ')
                        .then(a => {
                            quiz.question = q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();
        })
        .then(quiz => {
            log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize("=>", 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


exports.testCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error(`No existe un quiz asociado al id = ${id}`);
            }
            return makeQuestion(rl, quiz.question)
                .then(a => {
                    //const resp = (answer || "").toLocaleLowerCase().trim()
                    if(a.toLowerCase().trim() == quiz.answer.toLowerCase().trim()) {
                        console.log("CORRECTO.", "green");
                    } else {
                        log("INCORRECTO.", "red");
                    }
                });
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog("El quiz es erroneo: ");
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


exports.playCmd = rl => {
        let score = 0;
        let toBeResolved = new Array();
        models.quiz.findAll()
            .then(quizzes => {
                quizzes.forEach((quiz, id) => {
                    toBeResolved[id] = quiz;
                });
                const playOne = () => {
                    if (toBeResolved.length === 0) {
                        log("No hay más preguntas.");
                        log(`Fin del quiz. Aciertos: ${score}`);
                        biglog(`${score}`,'green');
                        rl.prompt();
                    } else {
                        var aleat = Math.floor(Math.random() * toBeResolved.length);
                        let quiz = toBeResolved[aleat];
                        toBeResolved.splice(aleat, 1);
                        return makeQuestion(rl, quiz.question)
                            .then(a => {
                                if (a.toLowerCase().trim() == quiz.answer.toLowerCase().trim()) {
                                    score++;
                                    console.log(`CORRECTO - Lleva ${score} aciertos`);
                                    //log("Su respuesta es:");
                                    //log("CORRECTA", "green");
                                    //log(`Preguntas acertadas: ${colorize(score, "yellow")}`, "green");
                                    playOne();
                                } else {
                                    console.log(`INCORRECTO. Fin del examen. Aciertos: ${score}`);
                                    //log("Su respuesta es:");
                                    //log("INCORRECTA", "red");
                                    //log(`Fin.Preguntas acertadas: ${colorize(score, "yellow")}`, "green");
                                    rl.prompt();
                                }
                            })
                            .catch(Sequelize.ValidationError, error => {
                                errorlog("El quiz es erróneo: ");
                                error.errors.forEach(({ message }) => errorlog(message));
                            })
                            .catch(error => {
                                errorlog(error.message);
                            })
                            .then(() => {
                                rl.prompt();
                            });
                    }
                };
                playOne();
            });
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