const { response, request } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid')

const app = express();

// Middleware do express, que faz com que a aplicação procure e analise requisições onde o content-type do header seja JSON.
app.use(express.json());

// Criação de um array para receber os dados cadastrados e gravar na memória.
const customers = []

// Middleware para verificar conta existente.
function veryfyIfExistsAccountCPF(request, response, next){
    // Captura o atributo cpf a partir do cpf do jSON, usando a desestruturação  
    const { cpf } = request.headers;
    /**
     * - Utilizando o método find, assim buscando os dados que satisfaçam a função de testes provida
     * - Na arrow function, é percorrido o array customers, onde é verificado customer por customer, até que o atributo cpf, 
     * tenha uma combinação exata com o dado desestruturado anteriormente
     */ 
    const customer = customers.find((customer) => customer.cpf === cpf);

    // Agora é feito uma verificação. Caso a função find não encontre uma combinação, é retornado código 400 e mensagem de erro.
    if(!customer){
        return response.status(400).json({ error: "Customer not found!"});
    }

    // Caso encontre, um objeto customer é retornado dentro do request, para ser utilizado fora do middleware.
    request.customer = customer;
    //console.log(typeof(request.customer)); - returns object

    // Chama a função next e continua a execução no próximo método.
    return next();
}

function getBalance(statement) {
    /**
     * Função reduce - Vai buscar informações de determinado valor passado, e vai transformar os valores em um único valor
     * Irá fazer o calculo do que entrou e o que saiu
     * Recebe os parâmentros: Acumulador e Operação
     * 
     * Se o tipo de operação for crédito, o valor é adicionado a conta. Caso seja qualquer outra coisa, será feito subtração.
     * 
     * Feito alteração no código, para definir exatamente os tipos de operações que podem ser executadas.
     * 
     * Antes:
     * if(operation.type == 'credit') {
            return acc + operation.amount;
        } else{
            return acc - operation.amount;
            }
        }, 0);
     * 
     * Agora:
     */
    const balance = statement.reduce((acc, operation) => {
        if(operation.type == 'credit') {
            return acc + operation.amount;
        } if (operation.type == 'debit'){
            return acc - operation.amount;
        } else {
            return response.status(400).json({error: "Operation not recognize!"});
        }
    }, 0);

    //Retorna o balance da conta
    return balance;
}

// Rota para buscar conta pelo CPF
app.get("/account", veryfyIfExistsAccountCPF, (request, response) => {
    // Desestrutura o customer a partir do request enviado pelo Middleware
    const { customer } = request;
    // Retorna o customer como JSON
    return response.json(customer);
})

// Rota para editar a conta pelo CPF
app.put('/account', veryfyIfExistsAccountCPF, (request, response) => {
    // Desestrutura o name e o customer para obter os dados
    const { name } = request.body;
    const { customer } = request;
    // Atribui novo nome
    customer.name = name;
    // Retorna uma resposta de sucesso
    return response.status(201).send();
})
// Rota para cadastrar nova conta
app.post("/account", (request, response) => {
    // Desestrutura o name e o cpf para obter os dados
    const { name, cpf } = request.body;
    /**
     * Verifica se os dados passados já existem no cadastro de contas a partir do CPF
     * Método some() executa a função de callback uma vez pra cada elementro presente no array, até retornar 'true'
     * Nesse caso, a arrow function de teste faz uma verificação a partir do CPF passado com o CPF do array
     */
    const customerAlreadyExists = customers.some(
        (customers) => customers.cpf === cpf
    );
    // Caso o retorno do método some() seja true, entra no if, retornando erro
    if(customerAlreadyExists) {
        return response.status(400).json({error: "Customers already exists!"});
    }
    // Caso o retorno do método some() seja false, é feito um push, adicionando os valores no final do array
    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });
    // Retornando mensagem de sucesso
    return response.status(201).send();
})

// Rota para buscar o extrato
app.get("/statement/", veryfyIfExistsAccountCPF, (request, response) => {
    // Desestrutura o customer para obter os dados
    const { customer } = request;
    // Retorna o extrato do customer
    return response.json(customer.statement)
})

// Rota para buscar o extrato por data
app.get("/statement/date", veryfyIfExistsAccountCPF, (request, response) => {
    // Desestrutura o customer e date para obter os dados
    const { customer } = request;
    const { date } = request.query;
    // Criando uma nova instancia de Date e atribuindo a data informada pelo QueryParamms
    const dateFormat = new Date(date + " 00:00")
    /**
     *  Vai transformar a data e comparar se é a mesma data da solicitada.
     *  Utilizando a função filter(), testamos com uma arrow function todos os elementos do array.
     *  Na arrow function, buscamos os dados do atributo created_at e fazemos um parse para string.
     *  Aí comparamos a data 
     * Os que retornarem true, são jogados em um novo array, onde faremos um parse
     * 
     * const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString());
     * Acimam, no original, a instrutora havia criado uma nova instância (new Date) e passava o dateFormat nela, porém, não há necessidade de recriar. Apenas realizar o parse.
     */ 
    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === dateFormat.toDateString());
    // Retorna o extrato como JSON
    return response.json(statement)
})
// Rota para depositar um montante a conta
app.post("/deposit", veryfyIfExistsAccountCPF ,(request, response) => {
    // Desestrutura a description e o amount para obter os dados
    const { description, amount } = request.body;
    const { customer } = request;

    // Cria uma nova operação de acordo com os dados recebidos
    const statementOperation = {
        description,
        amount,
        type: "credit",
        created_at: new Date()
    }
    // Faz um push, adicionando os valores no array
    customer.statement.push(statementOperation);
    // Retorna mensagem de sucesso
    return response.status(201).send();
})
// Rota para sacar um montante a conta
app.post("/withdraw", veryfyIfExistsAccountCPF ,(request, response) => {
    // Desestrutura o amount e o customer para obter os dados
    const { amount } = request.body;
    const { customer } = request;
    // Captura os dados do statement do customer
    const balance = getBalance(customer.statement);
    // Verificar se o valor é maior que o valor do saque
    if(balance < amount){
        // Se o valor do saque for maior que o valor em conta, é gerado um erro
        return response.status(400).json({error: "Insufficient funds!"})
    }
    // Se tudo ocorrer bem, os dados são organizados e é feito um push para adicionar os dados no array
    const statementOperation = {
        amount,
        type: "debit",
        created_at: new Date()
    }
    customer.statement.push(statementOperation);
    // Retorna mensagem de sucesso
    return response.status(201).send();
})

// Rota para deleção da conta
app.delete("/account", veryfyIfExistsAccountCPF, (request, response) => {
    // Desestrutura o customer para obter os dados
    const { customer } = request;

    // Utilizado o método splice() para retirar o indice do array em que o customer se encontra
    customers.splice(customer, 1);
    // Retorna mensagem de sucesso
    return response.status(200).json(customers);
})

// Rota para pegar o valor em conta
app.get("/balance", veryfyIfExistsAccountCPF, (request, response) => {
    // Desestrutura o customer para obter os dados
    const { customer } = request;
    // Captura os dados do statement do customer
    const balance = getBalance(customer.statement);
    // Retorna o valor contido em balance para o usuário
    return response.json(balance);
})

// Inicia o servidor do express
app.listen(3000, (request, response) => {
    console.log("Server is running... Open: http://localhost/3000");
})