function Response(error, status, data) {
    this.Error = error;
    this.Status = status;
    this.Data = data;
}

module.exports = Response;