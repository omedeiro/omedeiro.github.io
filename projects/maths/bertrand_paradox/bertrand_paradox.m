
radius = 2;
close all


N = 1000;
angles = linspace(0,360, N);
CenterX = 0;
CenterY = 0;
x = radius .* cos(angles) + CenterX;
y = radius .* sin(angles) + CenterY;
% plot(x,y, 'k', 'LineWidth',0.1)
subplot(3,1,1)
hold on
c = summer(N);
c1 = [103 103 100]./255;
c2 = [247 153 113]./255;
for i = 1:N
    r1 = randi(N);
    r2 = randi(N);

    p1(i,:) = [x(r1) y(r1)];
    p2(i,:) = [x(r2) y(r2)];

    midpoint(i,:) = [(p1(i,1)+p2(i,1))/2 (p1(i,2)+p2(i,2))/2];
    
    if (midpoint(i,1)-CenterX)^2+(midpoint(i,2)-CenterY)^2>(radius/2)
        carray(i,:) = c1;
    else
        carray(i,:) = c2;
    end

end

for i = 1:100
    plot([p1(i,1) p2(i,1)], [p1(i,2) p2(i,2)], 'Color', carray(i,:));
    hold on
end
axis equal
axis off


%% 
subplot(3,1,2)

N = 1000;
angles = linspace(0,360, N);
CenterX = 0;
CenterY = 0;
x = radius .* cos(angles) + CenterX;
y = radius .* sin(angles) + CenterY;
a = radius*3/sqrt(3);

for i = 1:N
    r1 = randi(N);
    r2 = randi(N);

    p1(i,:) = [CenterX CenterY-radius];
    p2(i,:) = [x(r1) y(r1)];

    if x(r1) > -a/2 && x(r1) < a/2 && y(r1) > radius/2
        carray(i,:) = c2;
    else
        carray(i,:) = c1;
    end

end


for k = 1:100
    i = randi(N);
    disp(i)
    plot([p1(i,1) p2(i,1)], [p1(i,2) p2(i,2)], 'Color', carray(i,:));
    hold on
end
axis equal
axis off

% trix = [-a/2 a/2 0];
% triy = [radius/2, radius/2, -radius];
% plot(trix, triy)


%% 
subplot(3,1,3)

N = 1000;
angles = linspace(0,360, N);
CenterX = 0;
CenterY = 0;
x = radius .* cos(angles) + CenterX;
y = radius .* sin(angles) + CenterY;
a = radius*3/sqrt(3);

for i = 1:N
    r1 = randi(N);
    r2 = randi(N);

    p1(i,:) = [x(r1) y(r1)];
    p2(i,:) = [-x(r1) y(r1)];

    if abs(y(r1)) > radius/2  
        carray(i,:) = c2;
    else
        carray(i,:) = c1;
    end

end

for k = 1:100
    i = randi(N);
    disp(i)
    plot([p1(i,1) p2(i,1)], [p1(i,2) p2(i,2)], 'Color', carray(i,:));
    hold on
end
axis equal
axis off



