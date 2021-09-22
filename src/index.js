const { response, request } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid')

const app = express();

app.use(express.json());

const customers = []

function veryfyIfExistsAccountCPF(request, response, next){
    const { cpf } = request.headers;
    const customer = customers.find((customer) => customer.cpf === cpf);

    if(!customer){
        return response.status(400).json({ error: "Customer not found!"});
    }

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type == 'credit') {
            return acc + operation.amount;
        } if (operation.type == 'debit'){
            return acc - operation.amount;
        } else {
            return response.status(400).json({error: "Operation not recognize!"});
        }
    }, 0);

    return balance;
}

app.get("/account", veryfyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    
    return response.json(customer);
})

app.put('/account', veryfyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
})
app.post("/account", (request, response) => {
    const { name, cpf } = request.body;

    const customerAlreadyExists = customers.some(
        (customers) => customers.cpf === cpf
    );
    
    if(customerAlreadyExists) {
        return response.status(400).json({error: "Customers already exists!"});
    }
    
    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();
})

app.get("/statement/", veryfyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer.statement)
})

app.get("/statement/date", veryfyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;
    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === dateFormat.toDateString());

    return response.json(statement)
})

app.post("/deposit", veryfyIfExistsAccountCPF ,(request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        type: "credit",
        created_at: new Date()
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
})

app.post("/withdraw", veryfyIfExistsAccountCPF ,(request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        type: "debit",
        created_at: new Date()
    }
    customer.statement.push(statementOperation);

    return response.status(201).send();
})

app.delete("/account", veryfyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
})

app.get("/balance", veryfyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const balance = getBalance(customer.statement);

    return response.json(balance);
})

app.listen(3000, (request, response) => {
    console.log("Server is running... Open: http://localhost/3000");
})