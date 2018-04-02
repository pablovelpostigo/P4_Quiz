
const { models } = require("./model");

const Sequelize = require("sequelize");

const { colorize, log, biglog, errorlog } = require("./out");


exports.helpCmd = (socket, rl) => {
    log(socket, "Commandos:");
    log(socket, " h|help - Muestra esta ayuda.");
    log(socket, " list - Listar los quizzes existentes.");
    log(socket, " show <id> - Muesta la pregunta y la respuesta el quiz indicado");
    log(socket, " add - Añadir un nuevo quiz interactivamente.");
    log(socket, " delete <id> - Borra el quiz indicado.");
    log(socket, " edit <id> - Editar el quiz indicado.");
    log(socket, " test <id> - Probar el quiz indicado.");
    log(socket, " p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket, " credits - Créditos.");
    log(socket, " q|quiz  - Salir del programa.");
    rl.prompt();
};

exports.listCmd = (socket, rl) => {

    models.quiz.findAll()
        .each(quiz => {
            log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


const validateId = (id) => {

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

exports.showCmd = (socket, rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id = ${id}.`);
            }
            log(socket, `[${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text,'red'), answer => {
            resolve(answer.trim()); //trim para quitar espacios en blanco vacios por delante y por detrás
        });
    });
};


exports.addCmd = (socket, rl) => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta ')
                .then(a => {
                    return { question: q, answer: a};
                });
            })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket, 'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(socket, message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();

        });

};

exports.deleteCmd = (socket, rl, id) => {

    validateId(id)
        .then(id => models.quiz.destroy({ where: { id } }))
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.editCmd = (socket, rl, id) => {
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
            log(socket, `Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize("=>", 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket, 'El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(socket, message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


exports.testCmd = (socket, rl, id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error(`No existe un quiz asociado al id = ${id}`);
            }
            return makeQuestion(rl, quiz.question)
                .then(a => {
                    if(a.toLowerCase().trim() == quiz.answer.toLowerCase().trim()) {
                        log(socket, 'Correcto');
                    } else {
                        log(socket, 'Incorrecto');
                    }
                });
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket, "El quiz es erroneo: ");
            error.errors.forEach(({message}) => errorlog(socket, message));
        })
        .catch(error => {
            errorlog(socket, error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


exports.playCmd = (socket, rl) => {
        let score = 0;
        let toBeResolved = [];
        models.quiz.findAll()
            .then(quizzes => {
                quizzes.forEach((quiz, id) => {
                    toBeResolved[id] = quiz;
                });
                const playOne = () => {
                    if (toBeResolved.length === 0) {
                        log(socket, 'Fin');
                        rl.prompt();
                    } else {
                        var aleat = Math.floor(Math.random() * toBeResolved.length);
                        let quiz = toBeResolved[aleat];
                        toBeResolved.splice(aleat, 1);
                        return makeQuestion(rl, quiz.question)
                            .then(a => {
                                if (a.toLowerCase().trim() == quiz.answer.toLowerCase().trim()) {
                                    score++;
                                    log(socket, 'Correcto');
                                    log(socket, `Preguntas acertadas: ${colorize(score, "yellow")}`);
                                    playOne();
                                } else {
                                    log(socket, 'Incorrecto');
                                    log(socket, `Fin.Preguntas acertadas: ${colorize(score, "yellow")}`);
                                    rl.prompt();
                                }
                            })
                            .catch(Sequelize.ValidationError, error => {
                                errorlog(socket, "El quiz es erróneo: ");
                                error.errors.forEach(({ message }) => errorlog(socket, message));
                            })
                            .catch(error => {
                                errorlog(socket, error.message);
                            })
                            .then(() => {
                                rl.prompt();
                            });
                    }
                };
                playOne();
            });
};


exports.creditsCmd = (socket, rl) => {
    log(socket, 'Autores de la práctica :');
    log(socket, 'Alberto Sánchez Delgado', 'green');
    log(socket, 'Pablo Velasco Postigo', 'green');
    rl.prompt();
};

exports.quitCmd = (socket, rl) => {
    rl.close();
    socket.end();
};