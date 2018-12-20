#ifdef GL_ES
   precision highp float;
#endif
#define pi 3.14159
const float dotsnb = 30.0; // Number of dots

varying vec3 v_FragPos;
varying vec3 v_center;
uniform vec2 iResolution;
uniform float iTime;
uniform float iRadius;
uniform vec3 iColor;
uniform float iSpeed;
vec3 hsb2rgb(in vec3 c)
{
   vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0 );
   rgb = rgb*rgb*(4.0-2.0*rgb);
   return c.z * mix( vec3(1.0), rgb, c.y);
}

void main()
{
  float r = length(v_FragPos - v_center);
  r = r*2.-1.;
  if(r>iRadius) {
    gl_FragColor = vec4(1.0,1.0,1.0, 0.0);
  } else {
    //vec3 color = hsb2rgb(vec3(fract(iTime*.1),.7,.4));
    vec3 color = iColor;
    float s = abs(sin(pow(r+5.0, 1.5)-iTime*iSpeed+sin(r*0.9))*sin(r+.99));
    color *= (abs(1./(s*10.8))-.01);
    gl_FragColor = vec4(color, (color.x + color.y + color.z) / 1.0);
  }
}