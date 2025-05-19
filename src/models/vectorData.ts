class VectorData
{
    id: string;
    term: string;
    embedding: number[];

    /**
     * Represents the data required for a vector batch insert.
     * @param id - The unique identifier for the vector.
     * @param term - The term or keyword associated with the vector.
     * @param embedding - The numerical representation of the term.
     */
    constructor(id: string, term: string, embedding: number[])
    {
        this.id = id;
        this.term = term;
        this.embedding = embedding;
    }

    /**
     * Converts the VectorData instance to the format required by the vector database.
     * @returns The formatted object for vector database insertion.
     */
    toDatabaseFormat(): { vector: number[]; payload: { id: string; term: string } }
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

export default VectorData;
