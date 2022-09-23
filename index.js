const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

const HTTP_OK_STATUS = 200;
const PORT = '3000';

// não remova esse endpoint, e para o avaliador funcionar
app.get('/', (_request, response) => {
  response.status(HTTP_OK_STATUS).send();
});

const readFile = () => {
  const data = fs.readFileSync('talker.json', 'utf-8');
  return JSON.parse(data);
};

app.get('/talker', (_req, res) => {
  if (!readFile()) return res.status(200).json([]);
  return res.status(200).json(readFile());
});

app.get('/talker/:id', (req, res) => {
  const { id } = req.params;
  const searchIDs = readFile().find((searchID) => searchID.id === Number(id));
  if (!searchIDs) {
 return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
}
  return res.status(200).json(searchIDs);
});

const emailAndPassword = (req, res, next) => {
  const passwordLength = 6;
  const regex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  // https://www.w3resource.com/javascript/form/email-validation.php
  const { email, password } = req.body;
  if (!email) { return res.status(400).json({ message: 'O campo "email" é obrigatório' }); }

  if (!regex.test(email)) {
    return res.status(400).json({ message: 'O "email" deve ter o formato "email@email.com"' });
  }
  if (!password) {
    return res.status(400).json({ message: 'O campo "password" é obrigatório' });
  }
  if (password.toString().length < passwordLength) {
    return res.status(400).json({ message: 'O "password" deve ter pelo menos 6 caracteres' });
  }
  next();
};

app.post('/login', emailAndPassword, (_req, res) => {
  const token = crypto.randomBytes(8).toString('hex');
  return res.status(200).json({ token });
});

const authorizationToken = (req, res, next) => {
  const authorizationLength = 16;
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ message: 'Token não encontrado' });
  }
  if (authorization.length !== authorizationLength) {
    return res.status(401).json({ message: 'Token inválido' });
  }
  next();
};

const nameValidation = (req, res, next) => {
  const nameLength = 3;
  const { name } = req.body;
  if (!name) { return res.status(400).json({ message: 'O campo "name" é obrigatório' }); }
  if (name.length <= nameLength) {
    return res.status(400).json({ message: 'O "name" deve ter pelo menos 3 caracteres' });
  }
  return next();
};

const ageValidation = (req, res, next) => {
  const ageYears = 18;
  const { age } = req.body;
  if (!age) { return res.status(400).json({ message: 'O campo "age" é obrigatório' }); }
  if (Number(age) <= ageYears) {
    return res.status(400).json({ message: 'A pessoa palestrante deve ser maior de idade' });
  }
  return next();
};

const talkerValidation = (req, res, next) => {
  const { talk } = req.body;
  if (!talk) {
    return res.status(400).json({
        message:
          'O campo "talk" é obrigatório e "watchedAt" e "rate" não podem ser vazios',
      });
  }
  return next();
};

const talkerInfoValidation = (req, res, next) => {
  const {
    talk: { watchedAt, rate },
  } = req.body;
  if ([watchedAt, rate].includes(undefined)) {
    return res.status(400).json({
        message:
          'O campo "talk" é obrigatório e "watchedAt" e "rate" não podem ser vazios',
      });
  }
  if (!watchedAt.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return res.status(400).json({ message: 'O campo "watchedAt" deve ter o formato "dd/mm/aaaa"' });
  }
  if (rate < 1 || rate > 5) {
    return res.status(400).json({ message: 'O campo "rate" deve ser um inteiro de 1 à 5' });
  }
  return next();
};

app.post(
  '/talker',
  authorizationToken,
  nameValidation,
  ageValidation,
  talkerValidation,
  talkerInfoValidation,
  (req, res) => {
    const { name, age, talk } = req.body;
    const talkers = readFile();
    const id = talkers.sort((a, b) => b.id - a.id)[0].id + 1;
    const postNewTalker = { name, age, id, talk };
    talkers.push(postNewTalker);
    fs.writeFileSync('talker.json', JSON.stringify(talkers));
    res.status(201).json(postNewTalker);
  },
);

app.put(
  '/talker/:id',
  authorizationToken,
  nameValidation,
  ageValidation,
  talkerValidation,
  talkerInfoValidation,
  (req, res) => {
    const { name, age, talk } = req.body;
    const id = Number(req.params.id);
    const talkers = readFile();
    const putTalker = { name, age, id, talk };
    const deleteTalker = talkers.filter((talker) => talker.id !== id);
    deleteTalker.push(putTalker);
    fs.writeFileSync('talker.json', JSON.stringify(deleteTalker));
    res.status(200).json(putTalker);
  },
);

app.delete('/talker/:id', authorizationToken, (req, res) => {
  const id = Number(req.params.id);
  const talkers = readFile();
  const deleteTalker = talkers.filter((talker) => talker.id !== id);
  fs.writeFileSync('talker.json', JSON.stringify(deleteTalker));
  res.status(204).end();
});

app.listen(PORT, () => console.log('Run server http://localhost:3000'));
