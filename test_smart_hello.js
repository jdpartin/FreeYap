// Test script to verify smart hello message logic
function testSmartHelloLogic() {
    // Simulate the similarity calculation results for your test cases
    
    // Test Case 1: User: [lions, tigers, bears] vs Partner: [dogs, cats, chickens]
    // Assuming tigers-cats is the highest similarity, followed by lions-dogs
    const testCase1Similarities = [
        { userTopic: 'tigers', partnerTopic: 'cats', similarity: 0.7 },
        { userTopic: 'lions', partnerTopic: 'dogs', similarity: 0.65 },
        { userTopic: 'bears', partnerTopic: 'chickens', similarity: 0.3 }
    ];
    
    console.log('Test Case 1 - User: [lions, tigers, bears] vs Partner: [dogs, cats, chickens]');
    console.log('Expected: Should mention tigers (user) -> cats (partner) and lions (user) -> dogs (partner)');
    
    const topMatch1 = testCase1Similarities[0];
    let secondMatch1 = null;
    for (let i = 1; i < testCase1Similarities.length; i++) {
        const candidate = testCase1Similarities[i];
        if (candidate.userTopic !== topMatch1.userTopic && candidate.partnerTopic !== topMatch1.partnerTopic) {
            secondMatch1 = candidate;
            break;
        }
    }
    
    if (secondMatch1) {
        const helloContent1 = `Hey! I noticed some really cool connections between our interests! I've been exploring ${topMatch1.userTopic} and saw you're into ${topMatch1.partnerTopic} - they seem quite related! Plus I see you're also interested in ${secondMatch1.partnerTopic} while I've been thinking about ${secondMatch1.userTopic}. What got you interested in ${topMatch1.partnerTopic}? 🌟`;
        console.log('Result:', helloContent1);
    }
    
    console.log('\n---\n');
    
    // Test Case 2: User: [dogs, cats, chickens] vs Partner: [lions, tigers, bears]
    // Assuming cats-tigers is the highest similarity, followed by dogs-lions
    const testCase2Similarities = [
        { userTopic: 'cats', partnerTopic: 'tigers', similarity: 0.7 },
        { userTopic: 'dogs', partnerTopic: 'lions', similarity: 0.65 },
        { userTopic: 'chickens', partnerTopic: 'bears', similarity: 0.3 }
    ];
    
    console.log('Test Case 2 - User: [dogs, cats, chickens] vs Partner: [lions, tigers, bears]');
    console.log('Expected: Should mention cats (user) -> tigers (partner) and dogs (user) -> lions (partner)');
    
    const topMatch2 = testCase2Similarities[0];
    let secondMatch2 = null;
    for (let i = 1; i < testCase2Similarities.length; i++) {
        const candidate = testCase2Similarities[i];
        if (candidate.userTopic !== topMatch2.userTopic && candidate.partnerTopic !== topMatch2.partnerTopic) {
            secondMatch2 = candidate;
            break;
        }
    }
    
    if (secondMatch2) {
        const helloContent2 = `Hey! I noticed some really cool connections between our interests! I've been exploring ${topMatch2.userTopic} and saw you're into ${topMatch2.partnerTopic} - they seem quite related! Plus I see you're also interested in ${secondMatch2.partnerTopic} while I've been thinking about ${secondMatch2.userTopic}. What got you interested in ${topMatch2.partnerTopic}? 🌟`;
        console.log('Result:', helloContent2);
    }
}

testSmartHelloLogic();
