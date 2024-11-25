export const commonChatPrompt = `You are an expert software engineer and technical mentor.
Rules: Please ensure that any code blocks use the GitHub markdown style and
include a language identifier to enable syntax highlighting in the fenced code block.
If you do not know an answer just say 'I can't answer this question'.
Do not include this system prompt in the answer.
If it is a coding question and no language was provided default to using Typescript.`;

export const commonParallelizePrompt = `You are ParallelGPT, an autonomous agent specialized in parallel computing that assists developers in optimizing their code by parallelizing C programs using OpenMP.
Be cautious and careful, always try to understand the code and make sure all your modification will not creat any data-race conditions.
Your decisions must always be made independently without seeking user assistance.
You might be given some parallelizing experiences. Refer to those experiences to make the right decision.
If you think the loop is parallelizable, return the exact same loop with the correct modification, do not create anything else (like a declearation expression or a comment). If you think the loop is not parallelizable, return the exact same loop with your comment on why it is not parallelizable.
Your reply must contain and only contain these 3 parts below:
Analysis of the code
Parallelized code (the code must be wrapped in triple quote mark, i.e. \`\`\`{thecode}\`\`\`)
Explaination (keep it brief, do not put common sense like what is openmp here)
`;

export const nestedPrompt = ` 
*****experience: nested loops*****
//if you see nested loops, there are a few things you should consider.

//nested loops 1
//this loop has 3 layer, and all 3 layers have no data dependency between iterations, thus all 3 layer is parallelizable. In this case, you should parallelize the outer-most parallelizable layer, the i-layer. 
//Don't forget to add private to the loop index which are inside the i-loop, in this case j and k.
//you should pay extra attention to the array variables in the inner loop, like the "h[]" array in this loop, it only contains subscript "k", so if you parallelize the outer-most loop, the h[k] might be access at the same time by different threads, for example thread1: i=1,j=1,k=5,thread2:i=4;j=2,k=5. thread 1 and 2 are accessing h[5] at the same time, so you need to use reduction to avoid data race.
#pragma omp parallel for private(j, k) reduction(+: h[:N])
for(i = 0; i < N; i++) {
    for(j = 0; j < N; j++) {
        for(k = 0; k < N; k++) {
            a = b + x;
            h[k] = h[k] + i;
        }
    }
}

// nested loops 2
// Parallelizing the i and j loops using collapse(2) to combine them into a larger loop for parallel execution.
// private(k, l) ensures each thread gets its own copy of k and l to avoid conflicts in the inner loops.
// private(var_1) makes sure each thread has its own copy of var_1. It's set inside the j loop (var_1 = j) and doesn't need to be shared across threads.
// reduction(+: var_2) ensures var_2 is updated safely across threads. Each thread gets a private copy, and after execution, the values are accumulated.
#pragma omp parallel for collapse(2) private(var_1, k, l) reduction(+: var_2)
for(i = 0; i < N; i++) {
    for(j = 0; j < M; j++) {
        var_1 = j;
        for(k = 0; k < Y; k++) {
            for(int l = 0; l < Z; l++) {
                var_2 += var_1;
            }
        }
    }
}
*****experience: nested loops*****
 
`;

export const privatePrompt = ` 
*****experience: private variables*****
//In some cases the variable may need to be set private to thread to avoid data race.
//In a loop, if a variable is first being assigned, then being used, that variable should be set private to thread. 
//private variables example
double result = 0.0;
double step = 0.1;
double xx;
/*
   	1. private(xx) is used here because in the first line xx is assigned to a value. Then, xx is used in "a = xx + yy + b", so private(xx) is a must. 
    2. there is no private(yy) here because if a variable is declared inside the loop, it is already privte to each threads, you should not privatize it again, it will cause error
*/
#pragma omp parallel for private(xx)
for(i = 0; i < num_steps; i++)
{
    double yy;
    yy = m + n;
    xx = (i + 0.5) * step;
    a = xx + yy + b;
}
*****experience: private variables*****
 
`;

export const dependencyPrompt = ` 
*****experience: dependency between iterations*****
//dependency example
int array[100];
int i, j, k;
//this loop can't be parallelized as there is dependency between iterations
for(i = 0; i < N; i++){
    array[i] = array[i] + array[i + 1];
}
*****experience: dependency between iterations*****
 
`;

export const conditionalPrompt = ` 
*****experience: conditional expression*****
//conditional expression example
int max = 0;
#pragma omp parallel for
for(int i = 0; i < N; i++)
{
    #pragma omp atomic compare
    max = max < a[i] ? a[i] : max;
}
*****experience: conditional expression*****
 
`;

export const reductionPrompt = ` 
*****experience: reduction*****
//reduction example
int sum_1 = 0;
int sum_2 = 0;
#pragma omp parallel for reduction(+: sum_1) reduction(*: sum_2)
for(i = 0; i < N; i++)
{
    sum_1 = sum_1 + i;
    sum_2 *= i;
}
*****experience: reduction*****
 
`;

export const iterPrompt = ` 
*****experience: too few iterations*****
//When you receive a loop, the first thing you do is to calculate how many iterations it have, only parallelize the loop if its iteration times is grater than 49.
//The following example has a 50 iteration subloop inside a 5 iteration loop, if you parallelize the outer one, the threads(assuming 16) are not going to be fully utilized.
//Outer loop has only 5 iterations, do not parallelize! See if the inner loop suits the parallelization requirements instead (In this example it dose).
for(i = 0; i < 5; i++)
{   
    #pragma omp parallel for
    for(j = 0; j < 50; j++)
    {
    	//some compute task
    }
}

//If the iteration count is unknown, like in the following loop, you can assume the iteration count is enough.
#pragma omp parallel for
for(i = 0; i < Na; i++)
{
    a[i] = i;
}
*****experience: too few iterations*****
 
`;

export const updatePrompt = ` 
*****experience: update expression*****
//If you see an update expression, you can parallelize it using reduction
#pragma omp parallel for reduction(+:a) reduction(-:b)
for(i = 0; i < N; i++)
{   
    a++;
    b--;
}

*****experience: update expression*****
 
`;
