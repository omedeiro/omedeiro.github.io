function EulerSpiral
% Function plots, cornu spiral also known as euler spiral.

% get spiral data.
spiralData = getSpiralData;

[nRow, nColumn] = size(spiralData);
% get user input from command window
choice = getUserInput(['Enter a choice from 1 to ' num2str(nColumn) ...
    '\n'] , 1, nColumn);

func = spiralData(choice).func;
t = -2.5:0.005:2.5;
len = length(t);
x = zeros(1, len);
y = zeros(1, len);

h_wait = waitbar(0,'Please wait...');

%this will expand to sin(0.5*pi*(t.^2)), depending on choice.
s1 = @(t)(sin(0.5*pi*func(t)));
%this will expand to cos(0.5*pi*(t.^2)), depending on choice.
s2 = @(t)(cos(0.5*pi*func(t)));

%evaluation of fresnel integral
for n = 2:len
    x(n) = x(n-1)+ integral( s1, t(n-1), t(n));
    y(n) = y(n-1)+ integral( s2, t(n-1), t(n));
    waitbar(n/len,h_wait);
end

close(h_wait)
plot(y,x,'LineWidth',2,'Color',[0 0 0.7]);
box on
daspect([1 1 1]);
end

function eulerSpiralData = getSpiralData
% Function returns structure array, having a function handle at index.
% Handle is a polynomial that has to be integrated. Function take no input
% argument.
eulerSpiralData(1).func = @(t)(-0.6*t+0.2*t.^5-0.1*t.^3);
eulerSpiralData(2).func = @(t)(t.^7-t.^3-t-2);
eulerSpiralData(3).func = @(t)(t.^5-3*t.^3-t);
eulerSpiralData(4).func = @(t)(t.^7-4*t);
eulerSpiralData(5).func = @(t)(4*t.^5+t.^3-4*t);
eulerSpiralData(6).func = @(t)(t.^7-t.^5-2*t-12);
eulerSpiralData(7).func = @(t)(t.^7-t.^5-2*t.^3-1);
eulerSpiralData(8).func = @(t)(t.^3+t-2);
eulerSpiralData(9).func = @(t)(t.^3-2.335*t);
eulerSpiralData(10).func = @(t)(t.^3-4.27*t);
eulerSpiralData(11).func = @(t)(9*t.^5-18*t.^3+5*t);
eulerSpiralData(12).func = @(t)(t.^2);
eulerSpiralData(13).func = @(t)(t.^5+0.6*t-4*t.^3);
eulerSpiralData(14).func = @(t)(-t.^5-0.6*t+3*t.^3);
eulerSpiralData(15).func = @(t)(-t.^7+0.1*t-3*t);
eulerSpiralData(16).func = @(t)(t.^3-2*t.^5+0.3*t.^9-t);
eulerSpiralData(17).func = @(t)(t.^3-0.2*t.^5+1.5*t);
eulerSpiralData(18).func = @(t)(t.^3-0.1*t.^7+1.5*t);
end

function choice = getUserInput(promptStr, minNum, maxNum)
% return the user input and check the range of input
choice = input(promptStr);
if isempty(choice) || ~isnumeric(choice)
    error('enter a number');
elseif (choice < minNum) || (choice > maxNum)
    error(['enter a number between 1 to ' num2str(maxNum)]);
elseif isfloat(choice)
    %if choice is floating point value then truncate the fractional part
    choice = choice - mod(choice,1);
end
end