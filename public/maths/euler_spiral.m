close all

theta = 1.01; % make small changes

point1 = [0 0];

length = 360*2;
rad0 = 0;
x = zeros(length,1);
y = zeros(length,1);
for i = 2:length
    rad1 = rad0+(i*theta)*pi/180;

    point2 = point1 + [cos(rad1) sin(rad1)];
    deg = rad2deg(rad0);
    x(i) = point2(1);
    y(i) = point2(2);

    point1 = point2;
    rad0 = rad1;
    plot(x, y, 'k-')
    axis equal
    axis off
    % drawnow 
    % pause(0.1)
end

