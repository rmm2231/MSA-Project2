function Response(error, status, data) {
    this.error = error;
    this.status = status;
    this.data = data;
}

module.exports = Response;