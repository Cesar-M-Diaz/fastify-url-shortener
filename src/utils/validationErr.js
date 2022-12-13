function errorValidator (reply, errorMessage, action, email, password) {
  switch (errorMessage) {
    case 'body/email must match pattern "^\\S+@\\S+\\.\\S+$"':
      return reply.code(400).view('session.hbs', { error: 'please enter a valid email', button: action, action: '/' + action, email, password })
    case 'body/password must NOT have fewer than 5 characters':
      return reply.code(400).view('session.hbs', { error: 'password is to short', button: action, action: '/' + action, email, password })
    case 'body/url must match pattern "^(ftp|http|https):[^ "]+$"':
      return reply.code(409).view('error.hbs', { message: '400', subtitle: 'Please enter a valid url' })
  }
}

module.exports = errorValidator
