class VectorData
{
    /**
     * Represents the data required for a vector batch insert.
     * @param {string} id - The unique identifier for the vector.
     * @param {string} term - The term or keyword associated with the vector.
     * @param {Array<number>} embedding - The numerical representation of the term.
     */
    constructor(id, term, embedding)
    {
        this.id = id;
        this.term = term;
        this.embedding = embedding;
    }

    /**
     * Converts the VectorData instance to the format required by the vector database.
     * @returns {object} - The formatted object for vector database insertion.
     */
    toDatabaseFormat()
    {
        return {
            vector: this.embedding,
            payload: {
                id: this.id,
                term: this.term
            }
        };
    }
}

module.exports = VectorData;